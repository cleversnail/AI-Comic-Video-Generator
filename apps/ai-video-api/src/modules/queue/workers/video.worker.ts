import { Worker, Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { GenerationJobData } from '../queue.service';

export class VideoWorker {
  private readonly logger = new Logger(VideoWorker.name);
  private worker: Worker;

  constructor(redisUrl: string, private readonly processFn: (data: GenerationJobData) => Promise<any>) {
    this.worker = new Worker(
      'generation',
      async (job: Job) => {
        if (!job.name.startsWith('gen:video:')) return;
        this.logger.log(`Processing video job ${job.id}: ${job.name}`);
        await job.updateProgress(10);
        const result = await this.processFn(job.data);
        await job.updateProgress(100);
        return result;
      },
      { connection: { url: redisUrl }, concurrency: 2 },
    );

    this.worker.on('completed', (job) => this.logger.log(`Video job ${job.id} completed`));
    this.worker.on('failed', (job, err) => this.logger.error(`Video job ${job?.id} failed: ${err.message}`));
  }

  async close() { await this.worker.close(); }
}
