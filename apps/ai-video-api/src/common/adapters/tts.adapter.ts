import { BaseAdapter, KeyValidationResult } from './base.adapter';

export interface TTSInput {
  text: string;
  voiceId?: string;
  speed?: number;
}

export interface AudioResult {
  url: string;
  duration?: number;
}

export interface TTSAdapter extends BaseAdapter {
  synthesize(input: TTSInput, config: { apiKey: string; baseUrl?: string }): Promise<AudioResult>;
}
