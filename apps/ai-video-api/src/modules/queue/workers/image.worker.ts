import { Worker, Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { GenerationJobData } from '../queue.service';

export class ImageWorker {
  private readonly logger = new Logger(ImageWorker.name);
  private worker: Worker;

  constructor(redisUrl: string, private readonly processFn: (data: GenerationJobData) => Promise<any>) {
    this.worker = new Worker(
      'generation',
      async (job: Job) => {
        if (!job.name.startsWith('gen:image:')) return;
        this.logger.log(`Processing image job ${job.id}: ${job.name}`);
        await job.updateProgress(10);
        const result = await this.processFn(job.data);
        await job.updateProgress(100);
        return result;
      },
      { connection: { url: redisUrl }, concurrency: 3 },
    );

    this.worker.on('completed', (job) => this.logger.log(`Image job ${job.id} completed`));
    this.worker.on('failed', (job, err) => this.logger.error(`Image job ${job?.id} failed: ${err.message}`));
  }

  async close() { await this.worker.close(); }
}
