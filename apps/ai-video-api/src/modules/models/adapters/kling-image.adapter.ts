import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ImageAdapter, ImageInput, ImageResult, KeyValidationResult } from '../../../common/adapters';

@Injectable()
export class KlingImageAdapter implements ImageAdapter {
  readonly provider = 'Kling';
  readonly modelId = 'kling-image';
  private readonly logger = new Logger(KlingImageAdapter.name);
  private readonly baseUrl = 'https://api.klingai.com';

  /**
   * 支持两种 Key 格式：
   * 1. 直接 API Key: "api-key-kling-xxx" （直接用 Bearer 鉴权）
   * 2. ak:sk 格式（兼容旧方式，暂不使用）
   */
  private getAuthHeader(apiKey: string): string {
    return `Bearer ${apiKey}`;
  }

  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    try {
      const authHeader = this.getAuthHeader(apiKey);

      // 调用图片生成接口验证，用最小参数
      await axios.post(
        `${this.baseUrl}/v1/images/generations`,
        {
          model_name: 'kling-v1',
          prompt: 'test',
          n: 1,
          image_size: '1024x1024',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          timeout: 30000,
        }
      );

      return { valid: true, message: 'Kling API Key 有效' };
    } catch (error: any) {
      this.logger.warn(`Kling key validation failed: ${error.message}`);

      // 401/403 是 Key 问题
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { valid: false, message: `验证失败: ${error.response.data?.message || '鉴权失败，请检查 API Key'}` };
      }

      // 非鉴权错误（如 400 参数错误、429 限流）说明 Key 本身有效
      if (error.response) {
        return { valid: true, message: 'Kling API Key 有效' };
      }

      return { valid: false, message: `验证失败: ${error.message}` };
    }
  }

  async generateImage(input: ImageInput, config: { apiKey: string; baseUrl?: string }): Promise<ImageResult> {
    const authHeader = this.getAuthHeader(config.apiKey);

    const width = input.width || 1024;
    const height = input.height || 1024;
    const imageSize = `${width}x${height}`;

    try {
      this.logger.log(`Generating image with Kling, size=${imageSize}, prompt=${input.prompt.substring(0, 60)}...`);

      const createResponse = await axios.post(
        `${this.baseUrl}/v1/images/generations`,
        {
          model_name: 'kling-v1',
          prompt: input.prompt,
          negative_prompt: input.negativePrompt || '',
          n: 1,
          image_size: imageSize,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          timeout: 60000,
        }
      );

      const taskData = createResponse.data;

      // Kling 返回 task_id，需要轮询
      if (taskData.code === 0 && taskData.data?.task_id) {
        return await this.pollTask(taskData.data.task_id, authHeader);
      }

      // 直接返回结果
      if (taskData.code === 0 && taskData.data?.task_result?.images?.[0]?.url) {
        return { url: taskData.data.task_result.images[0].url, width, height };
      }

      throw new Error(`Kling 图片生成失败: ${taskData.message || JSON.stringify(taskData)}`);
    } catch (error: any) {
      this.logger.error(`Kling generateImage error: ${error.message}`, error.stack);
      if (error.response) {
        throw new Error(`Kling API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  private async pollTask(taskId: string, authHeader: string): Promise<ImageResult> {
    const maxAttempts = 60;
    const interval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      const response = await axios.get(
        `${this.baseUrl}/v1/images/generations/${taskId}`,
        {
          headers: { Authorization: authHeader },
          timeout: 10000,
        }
      );

      const data = response.data;

      if (data.code === 0) {
        const status = data.data?.task_status;

        if (status === 'succeed') {
          const imageUrl = data.data?.task_result?.images?.[0]?.url;
          if (imageUrl) {
            return { url: imageUrl };
          }
          throw new Error('Kling 返回成功但未包含图片 URL');
        }

        if (status === 'failed') {
          throw new Error(`Kling 图片生成失败: ${data.data?.task_status_msg || '未知错误'}`);
        }
      }
    }

    throw new Error('Kling 图片生成超时，请重试');
  }
}
