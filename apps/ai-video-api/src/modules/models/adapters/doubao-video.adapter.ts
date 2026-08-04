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
    // 火山引擎 Ark 平台 API
    const baseUrl = config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';

    this.logger.log(`Calling Doubao Video API: ${baseUrl}`);
    this.logger.log(`Video input: prompt=${input.prompt?.substring(0, 50)}..., duration=${input.duration}`);

    try {
      // 构建 content 数组
      const content: Array<Record<string, unknown>> = [
        {
          type: 'text',
          text: input.prompt || '',
        },
      ];

      // 如果有首帧参考图，添加到 content
      if (input.firstFrameUrl) {
        content.push({
          type: 'image_url',
          image_url: {
            url: input.firstFrameUrl,
          },
          role: 'reference_image',
        });
      }

      // Ark 平台视频生成接口
      // 模型 ID 映射：将我们的内部 ID 映射到火山引擎平台的实际模型名称
      const modelMapping: Record<string, string> = {
        'seedance': 'doubao-seedance-2-0-mini-260615',
        'doubao': 'doubao-seedance-2-0-mini-260615',
        'doubao-seedance-2-0-mini': 'doubao-seedance-2-0-mini-260615',
        'doubao-seedance-2-0-mini-260615': 'doubao-seedance-2-0-mini-260615',
      };

      // 如果 input.modelId 是我们的内部 ID，使用映射；否则使用默认值
      const modelName = modelMapping[input.modelId || ''] || 'doubao-seedance-2-0-mini-260615';
      this.logger.log(`Using model: ${modelName} (input.modelId: ${input.modelId})`);

      // 使用项目画面比例，而非从分辨率推导
      const aspectRatio = input.aspectRatio || '9:16';

      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/contents/generations/tasks`,
          {
            model: modelName,
            content,
            generate_audio: input.generateAudio ?? true,
            ratio: aspectRatio,
            duration: input.duration || 5,
            watermark: false,
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

      this.logger.log(`Doubao API response: ${JSON.stringify(data).substring(0, 200)}`);

      // 检查响应
      if (data.id) {
        // 异步任务，需要轮询
        return await this.pollTask(data.id, config.apiKey, baseUrl);
      }

      // 同步返回结果
      if (data.output?.video_url) {
        return {
          taskId: data.id || 'sync',
          status: 'completed',
          url: data.output.video_url,
          duration: input.duration,
        };
      }

      throw new Error(`豆包视频生成失败: ${data.error?.message || JSON.stringify(data)}`);
    } catch (error: any) {
      this.logger.error(`Doubao video API error: ${error.message}`);
      if (error.response) {
        throw new Error(`豆包 API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getVideoStatus(taskId: string, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult> {
    const baseUrl = config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';

    const response = await firstValueFrom(
      this.httpService.get(
        `${baseUrl}/contents/generations/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      )
    );

    const data = response.data;

    let status = 'processing';

    if (data.status === 'succeeded' || data.status === 'completed') {
      status = 'completed';
    } else if (data.status === 'failed' || data.status === 'error') {
      status = 'failed';
    }

    // 尝试多种可能的视频 URL 字段（Ark 平台返回 content.video_url）
    const videoUrl = data.content?.video_url ||
                     data.output?.video_url ||
                     data.output?.url ||
                     data.video_url ||
                     data.url ||
                     data.result?.video_url ||
                     data.result?.url;

    // 提取音频 URL
    const audioUrl = data.content?.audio_url ||
                     data.output?.audio_url ||
                     data.audio_url ||
                     data.result?.audio_url ||
                     undefined;

    return {
      taskId,
      status,
      url: videoUrl,
      audioUrl,
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
          `${baseUrl}/contents/generations/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        )
      );

      const data = response.data;

      this.logger.log(`Poll task ${taskId}: status=${data.status}, response=${JSON.stringify(data).substring(0, 200)}`);

      if (data.status === 'succeeded' || data.status === 'completed') {
        // 尝试多种可能的视频 URL 字段（Ark 平台返回 content.video_url）
        const videoUrl = data.content?.video_url ||
                         data.output?.video_url ||
                         data.output?.url ||
                         data.video_url ||
                         data.url ||
                         data.result?.video_url ||
                         data.result?.url;

        // 提取音频 URL（模型原生生成的配音）
        const audioUrl = data.content?.audio_url ||
                         data.output?.audio_url ||
                         data.audio_url ||
                         data.result?.audio_url ||
                         undefined;

        this.logger.log(`Task ${taskId} completed, videoUrl: ${videoUrl?.substring(0, 100)}, audioUrl: ${audioUrl?.substring(0, 100)}`);

        return {
          taskId,
          status: 'completed',
          url: videoUrl,
          audioUrl,
          duration: data.duration,
        };
      }

      if (data.status === 'failed' || data.status === 'error') {
        throw new Error(`豆包视频生成失败: ${data.error?.message || '未知错误'}`);
      }
    }

    throw new Error('豆包视频生成超时，请重试');
  }
}
