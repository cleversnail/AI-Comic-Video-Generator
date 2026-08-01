import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { TaskGateway } from '../websocket/websocket.gateway';
import { GenerationJobData } from './queue.service';

@Injectable()
export class GenerationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationWorker.name);
  private worker?: Worker<GenerationJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
    private readonly taskGateway: TaskGateway,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');

    this.worker = new Worker<GenerationJobData>(
      'generation',
      async (job) => this.processJob(job),
      {
        connection: { url: redisUrl },
        concurrency: 2,
      }
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err.message}`);
    });

    this.logger.log('GenerationWorker initialized and listening on generation queue');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async processJob(job: Job<GenerationJobData>): Promise<void> {
    const { taskId, projectId, capability, modelId, apiKeyId, input } = job.data;

    this.logger.log(`Processing job ${job.id}: ${capability} task ${taskId}`);

    // Update task status to processing
    await this.updateTaskStatus(taskId, 'processing', 0);

    try {
      const { apiKey } = await this.modelsService.resolveApiKeyById(apiKeyId);
      const model = await this.prisma.aIModel.findUnique({ where: { id: modelId } });
      const baseUrl = model?.apiBaseUrl || undefined;

      let result: Record<string, unknown> = {};

      switch (capability) {
        case 'image':
          result = await this.processImageGeneration(apiKey, modelId, baseUrl, input);
          break;
        case 'video':
          result = await this.processVideoGeneration(apiKey, modelId, baseUrl, input);
          break;
        case 'tts':
          result = await this.processTtsGeneration(apiKey, modelId, baseUrl, input);
          break;
        default:
          throw new Error(`Unsupported capability: ${capability}`);
      }

      // Update task with result
      await this.prisma.generationTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          progress: 100,
          result: JSON.parse(JSON.stringify(result)),
          completedAt: new Date(),
        },
      });

      // Update shot resultUrl if applicable
      if (job.data.shotId && result.url) {
        await this.prisma.shot.update({
          where: { id: job.data.shotId },
          data: { resultUrl: result.url as string, status: 'completed' },
        });
      }

      // Emit progress to WebSocket
      this.taskGateway.emitTaskProgress(job.data.userId, {
        taskId,
        projectId,
        status: 'completed',
        progress: 100,
        resultUrl: (result.url || result.audioUrl) as string | undefined,
      });
    } catch (error: any) {
      this.logger.error(`Task ${taskId} failed: ${error.message}`, error.stack);

      await this.prisma.generationTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          error: { message: error.message, stack: error.stack },
          retryCount: { increment: 1 },
        },
      });

      this.taskGateway.emitTaskProgress(job.data.userId, {
        taskId,
        projectId,
        status: 'failed',
        errorMessage: error.message,
      });

      throw error;
    }
  }

  private async processImageGeneration(
    apiKey: string,
    modelId: string,
    baseUrl: string | undefined,
    input: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const adapter = this.adapterFactory.getImageAdapter(modelId);
    const result = await adapter.generateImage(
      {
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        width: input.width,
        height: input.height,
        referenceImage: input.referenceImage,
      },
      { apiKey, baseUrl }
    );
    return { url: result.url, width: result.width, height: result.height };
  }

  private async processVideoGeneration(
    apiKey: string,
    modelId: string,
    baseUrl: string | undefined,
    input: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const adapter = this.adapterFactory.getVideoAdapter(modelId);
    const result = await adapter.generateVideo(
      {
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        firstFrameUrl: input.firstFrameUrl,
        lastFrameUrl: input.lastFrameUrl,
        duration: input.duration,
        resolution: input.resolution,
        modelId: input.modelId,  // 传递模型 ID
      },
      { apiKey, baseUrl }
    );
    return { taskId: result.taskId, url: result.url, duration: result.duration, status: result.status };
  }

  private async processTtsGeneration(
    apiKey: string,
    modelId: string,
    baseUrl: string | undefined,
    input: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const adapter = this.adapterFactory.getTTSAdapter(modelId);
    const result = await adapter.generateSpeech(
      {
        text: input.text,
        voiceId: input.voiceId,
        language: input.language,
        speed: input.speed,
        emotion: input.emotion,
      },
      { apiKey, baseUrl }
    );
    return { audioUrl: result.audioUrl, duration: result.duration };
  }

  private async updateTaskStatus(taskId: string, status: string, progress: number) {
    await this.prisma.generationTask.update({
      where: { id: taskId },
      data: { status, progress, startedAt: new Date() },
    });
  }
}
