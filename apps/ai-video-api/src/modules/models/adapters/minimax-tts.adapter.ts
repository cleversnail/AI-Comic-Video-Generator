import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TTSAdapter, TTSInput, TTSResult } from '../../../common/adapters/tts.adapter';
import { KeyValidationResult } from '../../../common/adapters/base.adapter';

@Injectable()
export class MiniMaxTTSAdapter implements TTSAdapter {
  readonly provider = 'MiniMax';
  readonly modelId = 'minimax-tts';
  private readonly logger = new Logger(MiniMaxTTSAdapter.name);

  constructor(private readonly httpService: HttpService) {}

  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    try {
      if (apiKey.length < 10) return { valid: false, message: 'Key 格式不正确' };
      return { valid: true, message: 'API Key 格式验证通过' };
    } catch (error: any) {
      return { valid: false, message: `验证失败: ${error.message}` };
    }
  }

  async generateSpeech(input: TTSInput, config: { apiKey: string; baseUrl?: string }): Promise<TTSResult> {
    const baseUrl = config.baseUrl || 'https://api.minimaxi.chat';

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/v1/t2a_v2`,
          {
            model: 'speech-01-turbo',
            text: input.text,
            voice_setting: {
              voice_id: input.voiceId || 'male-qn-qingse',
              speed: input.speed || 1.0,
            },
            audio_setting: {
              format: 'mp3',
              sample_rate: 32000,
            },
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

      const audioHex = response.data?.data?.audio;
      if (!audioHex) throw new Error('未获取到音频数据');

      // Convert hex to buffer and return as base64 data URL
      const audioBuffer = Buffer.from(audioHex, 'hex');
      const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

      return { audioUrl, duration: response.data?.extra_info?.audio_length || 0 };
    } catch (error: any) {
      this.logger.error(`MiniMax TTS error: ${error.message}`);
      throw error;
    }
  }
}
