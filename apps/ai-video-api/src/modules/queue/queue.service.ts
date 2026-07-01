import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export interface GenerationJobData {
  taskId: string;
  projectId: string;
  shotId?: string;
  capability: 'image' | 'video' | 'tts';
  modelId: string;
  apiKeyId: string;
  input: Record<string, any>;
  parameters?: Record<string, any>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly generationQueue: Queue;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.generationQueue = new Queue('generation', {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
    this.logger.log('QueueService initialized with BullMQ');
  }

  async addGenerationJob(data: GenerationJobData) {
    const jobName = `gen:${data.capability}:${data.modelId}`;
    const job = await this.generationQueue.add(jobName, data, {
      priority: data.capability === 'video' ? 1 : 5,
    });
    this.logger.log(`Job ${job.id} added: ${jobName} for task ${data.taskId}`);
    return job;
  }

  async getJobStatus(jobId: string) {
    const job = await this.generationQueue.getJob(jobId);
    if (!job) return null;
    return { id: job.id, status: await job.getState(), progress: job.progress, data: job.returnvalue };
  }
}
