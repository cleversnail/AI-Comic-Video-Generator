import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { ModelsService } from '../models/models.service';
import { GenerationJobData } from './queue.service';

@Injectable()
export class QueueProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueProcessor.name);
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactory,
    private readonly modelsService: ModelsService,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.worker = new Worker(
      'generation',
      async (job: Job<GenerationJobData>) => {
        this.logger.log(`Processing job ${job.id}: ${job.name}`);
        await this.processJob(job);
      },
      { connection: { url: redisUrl }, concurrency: 3 },
    );

    this.worker.on('completed', (job) =>
      this.logger.log(`Job ${job.id} completed`),
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job ${job?.id} failed: ${err.message}`),
    );

    this.logger.log('QueueProcessor worker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async processJob(job: Job<GenerationJobData>) {
    const { taskId, capability, modelId, apiKeyId, input } = job.data;

    // Mark task as processing
    await this.prisma.generationTask.update({
      where: { id: taskId },
      data: { status: 'processing', startedAt: new Date() },
    });

    await job.updateProgress(10);

    const userId = await this.getTaskUserId(taskId);
    const apiKey = await this.modelsService.getDecryptedApiKey(userId, apiKeyId);

    const model = await this.prisma.aIModel.findUnique({ where: { id: modelId } });
    const baseUrl = model?.apiBaseUrl || undefined;
    const config = { apiKey, baseUrl };

    try {
      let result: any;

      switch (capability) {
        case 'image': {
          const adapter = this.adapterFactory.getImageAdapter(modelId);
          const imageResult = await adapter.generateImage(
            {
              prompt: input.prompt || '',
              negativePrompt: input.negativePrompt,
              width: input.width,
              height: input.height,
              referenceImage: input.referenceImage,
            },
            config,
          );
          result = { url: imageResult.url, width: imageResult.width, height: imageResult.height };
          break;
        }
        case 'video': {
          const adapter = this.adapterFactory.getVideoAdapter(modelId);
          const videoResult = await adapter.generateVideo(
            {
              prompt: input.prompt || '',
              negativePrompt: input.negativePrompt,
              firstFrameUrl: input.firstFrameUrl,
              lastFrameUrl: input.lastFrameUrl,
              duration: input.duration,
              resolution: input.resolution,
            },
            config,
          );
          // If the video model is async, poll for completion
          if (videoResult.status === 'processing' && videoResult.taskId) {
            await job.updateProgress(50);
            result = await this.pollVideoStatus(adapter, videoResult.taskId, config);
          } else {
            result = videoResult;
          }
          break;
        }
        case 'tts': {
          const adapter = this.adapterFactory.getTTSAdapter(modelId);
          const ttsResult = await adapter.generateSpeech(
            {
              text: input.text || '',
              voiceId: input.voiceId,
              language: input.language,
              speed: input.speed,
              emotion: input.emotion,
            },
            config,
          );
          result = { url: ttsResult.audioUrl, duration: ttsResult.duration };
          break;
        }
        default:
          throw new Error(`Unsupported capability: ${capability}`);
      }

      await job.updateProgress(90);

      // Persist result
      await this.prisma.generationTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          progress: 100,
          result,
          completedAt: new Date(),
        },
      });

      // Update shot result URL if shotId is present
      if (job.data.shotId && result?.url) {
        await this.prisma.shot.update({
          where: { id: job.data.shotId },
          data: { resultUrl: result.url, status: 'completed' },
        });
      }

      await job.updateProgress(100);
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
      throw error; // Let BullMQ handle retry/backoff
    }
  }

  private async getTaskUserId(taskId: string): Promise<string> {
    const task = await this.prisma.generationTask.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
    if (!task) throw new Error(`Task ${taskId} not found`);
    return task.project.userId;
  }

  private async pollVideoStatus(
    adapter: any,
    taskId: string,
    config: { apiKey: string; baseUrl?: string },
    maxAttempts = 60,
    intervalMs = 5000,
  ): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      const status = await adapter.getVideoStatus(taskId, config);
      if (status.status === 'completed' || status.status === 'succeed') {
        return status;
      }
      if (status.status === 'failed' || status.status === 'error') {
        throw new Error(`Video generation failed: ${status.status}`);
      }
    }
    throw new Error(`Video generation timed out after ${maxAttempts * intervalMs / 1000}s`);
  }
}
