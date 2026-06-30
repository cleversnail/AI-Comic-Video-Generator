import { BaseAdapter, KeyValidationResult } from './base.adapter';

export interface ImageInput {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  referenceImage?: string;
}

export interface ImageResult {
  url: string;
  width?: number;
  height?: number;
}

export interface ImageAdapter extends BaseAdapter {
  generateImage(input: ImageInput, config: { apiKey: string; baseUrl?: string }): Promise<ImageResult>;
}
