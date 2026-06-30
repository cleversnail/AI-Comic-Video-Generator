import { BaseAdapter, KeyValidationResult } from './base.adapter';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMInput {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResult {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LLMAdapter extends BaseAdapter {
  generateText(input: LLMInput, config: { apiKey: string; baseUrl?: string }): Promise<LLMResult>;
}
