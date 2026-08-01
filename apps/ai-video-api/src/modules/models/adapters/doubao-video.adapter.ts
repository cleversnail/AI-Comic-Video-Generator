import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VideoAdapter, VideoInput, VideoResult } from '../../../common/adapters/video.adapter';
import { KeyValidationResult } from '../../../common/adapters/base.adapter';

@Injectable()
export class DoubaoVideoAdapter implements VideoAdapter {
  readonly provider = 'ByteDance';
  readonly modelId = 'doubao';
  private readonly logger = new Logger(DoubaoVideoAdapter.name);

  constructor(private readonly httpService: HttpService) {}

  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    try {
      // 豆包 API Key 格式通常为 "ak:sk" 或直接的 API Key
      if (apiKey.length < 10) {
        return { valid: false, message: 'Key 格式不正确' };
      }
      return { valid: true, message: 'API Key 格式验证通过' };
    } catch (error: any) {
      return { valid: false, message: `验证失败: ${error.message}` };
    }
  }

  async generateVideo(input: VideoInput, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult> {
    const baseUrl = config.baseUrl || 'https://open.volcengineapi.com';
    
    this.logger.log(`Calling Doubao Video API: ${baseUrl}`);
    this.logger.log(`Video input: prompt=${input.prompt?.substring(0, 50)}..., duration=${input.duration}`);

    try {
      // 豆包视频生成 API 调用
      // 注意：这里使用的是火山引擎的视觉生成 API
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/v1/video/generations`,
          {
            model: 'seedance-2.0-mini',
            prompt: input.prompt,
            duration: input.duration || 5,
            resolution: input.resolution || '1080p',
            first_frame_url: input.firstFrameUrl,
          },
          {
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        )
      );

      const data = response.data;
      
      // 检查响应
      if (data.task_id) {
        // 异步任务，需要轮询
        return await this.pollTask(data.task_id, config.apiKey, baseUrl);
      }

      // 同步返回结果
      if (data.video_url || data.output?.video_url) {
        return {
          taskId: data.task_id || 'sync',
          status: 'completed',
          url: data.video_url || data.output?.video_url,
          duration: input.duration,
        };
      }

      throw new Error(`豆包视频生成失败: ${JSON.stringify(data)}`);
    } catch (error: any) {
      this.logger.error(`Doubao video API error: ${error.message}`);
      if (error.response) {
        throw new Error(`豆包 API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getVideoStatus(taskId: string, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult> {
    const baseUrl = config.baseUrl || 'https://open.volcengineapi.com';
    
    const response = await firstValueFrom(
      this.httpService.get(
        `${baseUrl}/v1/video/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
          timeout: 10000,
        }
      )
    );

    const data = response.data;
    return {
      taskId,
      status: data.status || 'unknown',
      url: data.video_url || data.output?.video_url,
      duration: data.duration,
    };
  }

  private async pollTask(taskId: string, apiKey: string, baseUrl: string): Promise<VideoResult> {
    const maxAttempts = 60;
    const interval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      const response = await firstValueFrom(
        this.httpService.get(
          `${baseUrl}/v1/video/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 10000,
          }
        )
      );

      const data = response.data;

      if (data.status === 'completed' || data.status === 'succeed') {
        return {
          taskId,
          status: 'completed',
          url: data.video_url || data.output?.video_url,
          duration: data.duration,
        };
      }

      if (data.status === 'failed' || data.status === 'error') {
        throw new Error(`豆包视频生成失败: ${data.error?.message || data.message || '未知错误'}`);
      }
    }

    throw new Error('豆包视频生成超时，请重试');
  }
}
