import { BaseAdapter, KeyValidationResult } from './base.adapter';

export interface TTSInput {
  text: string;
  voiceId?: string;
  language?: string;
  speed?: number;
  emotion?: string;
}

export interface TTSResult {
  audioUrl: string;
  duration?: number;
}

export interface TTSAdapter extends BaseAdapter {
  generateSpeech(input: TTSInput, config: { apiKey: string; baseUrl?: string }): Promise<TTSResult>;
}
