import { BaseAdapter, KeyValidationResult } from './base.adapter';

export interface VideoInput {
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  resolution?: string;
  firstFrame?: string;
  lastFrame?: string;
  referenceImage?: string;
}

export interface VideoTaskResult {
  taskId: string;
  status: string;
  url?: string;
}

export interface VideoTaskStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  url?: string;
  error?: string;
}

export interface VideoAdapter extends BaseAdapter {
  generateVideo(input: VideoInput, config: { apiKey: string; baseUrl?: string }): Promise<VideoTaskResult>;
  getVideoTaskStatus(taskId: string, config: { apiKey: string; baseUrl?: string }): Promise<VideoTaskStatus>;
}
