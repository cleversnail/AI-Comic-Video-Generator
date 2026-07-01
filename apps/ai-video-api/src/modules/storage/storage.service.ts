import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get('STORAGE_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('STORAGE_PORT', '9000')),
      useSSL: this.configService.get('STORAGE_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('STORAGE_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get('STORAGE_SECRET_KEY', 'minioadmin'),
    });
    this.bucket = this.configService.get('STORAGE_BUCKET', 'ai-video');
    this.logger.log('StorageService initialized with MinIO');
  }

  async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Bucket ${this.bucket} created`);
    }
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.ensureBucket();
    await this.client.putObject(this.bucket, key, buffer, buffer.length, { 'Content-Type': contentType });
    return `/storage/${this.bucket}/${key}`;
  }

  async uploadUrl(key: string, url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    return this.uploadBuffer(key, buffer, contentType);
  }

  async getPresignedUrl(key: string, expiry = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expiry);
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  generateKey(projectId: string, type: string, shotId?: string): string {
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
    const suffix = shotId ? `/${shotId}` : '';
    return `${projectId}/${type}/${datePath}${suffix}/${Date.now()}.png`;
  }
}
