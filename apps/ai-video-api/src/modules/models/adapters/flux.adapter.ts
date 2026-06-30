import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ImageAdapter, ImageInput, ImageResult, KeyValidationResult } from '../../../common/adapters';

@Injectable()
export class FluxAdapter implements ImageAdapter {
  readonly provider = 'Black Forest Labs';
  readonly modelId = 'flux';
  private readonly logger = new Logger(FluxAdapter.name);

  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    try {
      const response = await axios.get('https://api.replicate.com/v1/account', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });
      return { valid: true, message: 'API Key 有效' };
    } catch (error: any) {
      this.logger.warn(`FLUX key validation failed: ${error.message}`);
      return { valid: false, message: `验证失败: ${error.response?.data?.detail || error.message}` };
    }
  }

  async generateImage(input: ImageInput, config: { apiKey: string; baseUrl?: string }): Promise<ImageResult> {
    const apiKey = config.apiKey;
    const modelVersion = 'black-forest-labs/flux-1.1-pro-ultra';

    try {
      const createResponse = await axios.post(
        'https://api.replicate.com/v2/predictions',
        {
          model: modelVersion,
          input: {
            prompt: input.prompt,
            width: input.width || 1024,
            height: input.height || 1024,
            output_format: 'png',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Prefer: 'wait',
          },
          timeout: 120000,
        }
      );

      const prediction = createResponse.data;

      if (prediction.status === 'succeeded' && prediction.output) {
        const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        return { url, width: input.width || 1024, height: input.height || 1024 };
      }

      if (prediction.status === 'processing' || prediction.status === 'starting') {
        return await this.pollPrediction(prediction.id, apiKey);
      }

      throw new Error(`FLUX 生成失败: ${prediction.status} - ${prediction.error || ''}`);
    } catch (error: any) {
      this.logger.error(`FLUX generate error: ${error.message}`, error.stack);
      if (error.response) {
        throw new Error(`FLUX API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  private async pollPrediction(predictionId: string, apiKey: string): Promise<ImageResult> {
    const maxAttempts = 60;
    const interval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      const response = await axios.get(
        `https://api.replicate.com/v2/predictions/${predictionId}`,
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10000 }
      );

      const prediction = response.data;

      if (prediction.status === 'succeeded') {
        const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        return { url };
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        throw new Error(`FLUX 生成失败: ${prediction.error || prediction.status}`);
      }
    }

    throw new Error('FLUX 生成超时，请重试');
  }
}
