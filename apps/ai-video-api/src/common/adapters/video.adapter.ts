import { BaseAdapter, KeyValidationResult } from './base.adapter';

export interface VideoInput {
  prompt: string;
  negativePrompt?: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;   // 项目画面比例，如 "9:16"、"16:9"、"1:1"
  generateAudio?: boolean; // 是否同步生成配音
  modelId?: string;  // 可选的模型 ID，用于覆盖默认值
}

export interface VideoResult {
  taskId: string;
  status: string;
  url?: string;
  audioUrl?: string;  // 同步生成的音频 URL
  duration?: number;
}

export interface VideoAdapter extends BaseAdapter {
  generateVideo(input: VideoInput, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult>;
  getVideoStatus(taskId: string, config: { apiKey: string; baseUrl?: string }): Promise<VideoResult>;
}
