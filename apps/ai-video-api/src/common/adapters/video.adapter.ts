import { BaseAdapter, KeyValidationResult } from './base.adapter';

export interface VideoInput {
  prompt: string;
  negativePrompt?: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  duration?: number;
  resolution?: string;
  modelId?: string;  // 可选的模型 ID，用于覆盖默认值
}

export interface VideoResult {
  taskId: string;
  status: string;
  url?: string;
  duration?: number;
}

export interface VideoAdapter extends BaseAdapter {
  generateVideo(input: VideoInput, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult>;
  getVideoStatus(taskId: string, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult>;
}
