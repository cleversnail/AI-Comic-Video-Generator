import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VideoAdapter, VideoInput, VideoResult } from '../../../common/adapters/video.adapter';
import { KeyValidationResult } from '../../../common/adapters/base.adapter';
import { BaseAdapter } from '../../../common/adapters/base.adapter';

@Injectable()
export class KlingVideoAdapter implements VideoAdapter {
  readonly provider = 'Kling';
  readonly modelId = 'kling-pro';
  private readonly logger = new Logger(KlingVideoAdapter.name);

  constructor(private readonly httpService: HttpService) {}

  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    try {
      const [ak, sk] = apiKey.split(':');
      if (!ak || !sk) return { valid: false, message: 'Key 格式应为 ak:sk' };
      return { valid: true, message: 'API Key 格式验证通过' };
    } catch (error: any) {
      return { valid: false, message: `验证失败: ${error.message}` };
    }
  }

  async generateVideo(input: VideoInput, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult> {
    const [ak, sk] = config.apiKey.split(':');
    const baseUrl = config.baseUrl || 'https://api.klingai.com';

    try {
      const createResponse = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/v1/videos/image2video`,
          {
            model: 'kling-v1',
            image: input.firstFrameUrl || '',
            prompt: input.prompt,
            negative_prompt: input.negativePrompt || '',
            cfg_scale: 0.5,
            mode: 'std',
            duration: input.duration === 10 ? '10' : '5',
            aspect_ratio: '9:16',
          },
          { headers: { Authorization: `Bearer ${ak}:${sk}`, 'Content-Type': 'application/json' }, timeout: 30000 }
        )
      );

      const taskId = createResponse.data?.data?.task_id;
      if (!taskId) throw new Error('未获取到 task_id');

      // Poll for result (max 5 min)
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollResponse = await firstValueFrom(
          this.httpService.get(`${baseUrl}/v1/videos/image2video/${taskId}`, {
            headers: { Authorization: `Bearer ${ak}:${sk}` },
          })
        );
        const taskData = pollResponse.data?.data;
        if (taskData?.task_status === 'succeed') {
          const videoUrl = taskData?.task_result?.videos?.[0]?.url;
          return { taskId, status: 'completed', url: videoUrl, duration: input.duration || 5 };
        }
        if (taskData?.task_status === 'failed') {
          throw new Error(`视频生成失败: ${taskData.task_status_msg || '未知错误'}`);
        }
      }
      throw new Error('视频生成超时');
    } catch (error: any) {
      this.logger.error(`Kling video API error: ${error.message}`);
      throw error;
    }
  }

  async getVideoStatus(taskId: string, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult> {
    const [ak, sk] = config.apiKey.split(':');
    const baseUrl = config.baseUrl || 'https://api.klingai.com';

    const pollResponse = await firstValueFrom(
      this.httpService.get(`${baseUrl}/v1/videos/image2video/${taskId}`, {
        headers: { Authorization: `Bearer ${ak}:${sk}` },
      })
    );

    const taskData = pollResponse.data?.data;
    return {
      taskId,
      status: taskData?.task_status || 'unknown',
      url: taskData?.task_result?.videos?.[0]?.url,
    };
  }
}
