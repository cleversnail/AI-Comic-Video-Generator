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
    // 火山引擎视觉生成 API
    const baseUrl = config.baseUrl || 'https://visual.volcengineapi.com';

    this.logger.log(`Calling Doubao Video API: ${baseUrl}`);
    this.logger.log(`Video input: prompt=${input.prompt?.substring(0, 50)}..., duration=${input.duration}`);

    try {
      // 火山引擎 CVSync2AsyncSubmitTask 接口
      // Action 和 Version 作为 Query 参数
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}?Action=CVSync2AsyncSubmitTask&Version=2022-08-31`,
          {
            ReqKey: 'seedance_2_0_mini_txt2video',
            Prompt: input.prompt || '',
            Duration: input.duration || 5,
            Resolution: input.resolution || '720p',
            ...(input.firstFrameUrl && { FirstFrameUrl: input.firstFrameUrl }),
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
      if (data.Code === 0 && data.Data?.task_id) {
        // 异步任务，需要轮询
        return await this.pollTask(data.Data.task_id, config.apiKey, baseUrl);
      }

      // 同步返回结果
      if (data.Data?.video_url) {
        return {
          taskId: data.Data.task_id || 'sync',
          status: 'completed',
          url: data.Data.video_url,
          duration: input.duration,
        };
      }

      // 检查是否有输出视频
      if (data.Data?.output_urls?.length > 0) {
        return {
          taskId: data.Data.task_id || 'sync',
          status: 'completed',
          url: data.Data.output_urls[0],
          duration: input.duration,
        };
      }

      throw new Error(`豆包视频生成失败: ${data.Message || JSON.stringify(data)}`);
    } catch (error: any) {
      this.logger.error(`Doubao video API error: ${error.message}`);
      if (error.response) {
        throw new Error(`豆包 API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getVideoStatus(taskId: string, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult> {
    const baseUrl = config.baseUrl || 'https://visual.volcengineapi.com';

    const response = await firstValueFrom(
      this.httpService.post(
        `${baseUrl}?Action=CVSync2AsyncGetResult&Version=2022-08-31`,
        {
          ReqKey: 'seedance_2_0_mini_txt2video',
          TaskId: taskId,
        },
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

    if (data.Code !== 0) {
      throw new Error(`查询任务状态失败: ${data.Message}`);
    }

    const taskData = data.Data;
    let status = 'processing';

    if (taskData.status === 'done' || taskData.status === 'success') {
      status = 'completed';
    } else if (taskData.status === 'failed' || taskData.status === 'error') {
      status = 'failed';
    }

    return {
      taskId,
      status,
      url: taskData.video_url || taskData.output_urls?.[0],
      duration: taskData.duration,
    };
  }

  private async pollTask(taskId: string, apiKey: string, baseUrl: string): Promise<VideoResult> {
    const maxAttempts = 60;
    const interval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}?Action=CVSync2AsyncGetResult&Version=2022-08-31`,
          {
            ReqKey: 'seedance_2_0_mini_txt2video',
            TaskId: taskId,
          },
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

      if (data.Code !== 0) {
        this.logger.warn(`Poll task failed: ${data.Message}`);
        continue;
      }

      const taskData = data.Data;

      if (taskData.status === 'done' || taskData.status === 'success') {
        return {
          taskId,
          status: 'completed',
          url: taskData.video_url || taskData.output_urls?.[0],
          duration: taskData.duration,
        };
      }

      if (taskData.status === 'failed' || taskData.status === 'error') {
        throw new Error(`豆包视频生成失败: ${taskData.error?.message || taskData.message || '未知错误'}`);
      }
    }

    throw new Error('豆包视频生成超时，请重试');
  }
}
