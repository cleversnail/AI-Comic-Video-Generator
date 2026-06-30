import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LLMAdapter, LLMInput, LLMResult, KeyValidationResult } from '../../../common/adapters';

@Injectable()
export class DeepSeekAdapter implements LLMAdapter {
  readonly provider = 'DeepSeek';
  readonly modelId = 'deepseek-v3';
  private readonly logger = new Logger(DeepSeekAdapter.name);

  constructor(private readonly httpService: HttpService) {}

  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    try {
      // DeepSeek doesn't have a simple balance API, so we do a minimal chat completion
      await this.generateText(
        {
          messages: [{ role: 'user', content: 'Hi' }],
          maxTokens: 5,
        },
        { apiKey }
      );
      return { valid: true, message: 'API Key 有效' };
    } catch (error: any) {
      this.logger.warn(`Key validation failed: ${error.message}`);
      return { valid: false, message: `验证失败: ${error.message}` };
    }
  }

  async generateText(input: LLMInput, config: { apiKey: string; baseUrl?: string }): Promise<LLMResult> {
    const baseUrl = config.baseUrl || 'https://api.deepseek.com';
    
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/chat/completions`,
          {
            model: 'deepseek-chat',
            messages: input.messages,
            temperature: input.temperature ?? 0.7,
            max_tokens: input.maxTokens ?? 2000,
          },
          {
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          }
        )
      );

      const data = response.data;
      const content = data.choices?.[0]?.message?.content || '';
      
      return {
        content,
        usage: data.usage,
      };
    } catch (error: any) {
      this.logger.error(`DeepSeek API error: ${error.message}`);
      if (error.response) {
        throw new Error(`DeepSeek API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}
