import { Injectable } from '@nestjs/common';
import { LLMAdapter, ImageAdapter, VideoAdapter, TTSAdapter, BaseAdapter } from './index';
import { DeepSeekAdapter } from '../../modules/models/adapters/deepseek.adapter';
import { FluxAdapter } from '../../modules/models/adapters/flux.adapter';
import { KlingImageAdapter } from '../../modules/models/adapters/kling-image.adapter';

export type CapabilityType = 'llm' | 'image' | 'video' | 'tts' | 'music' | 'sound';

@Injectable()
export class AdapterFactory {
  private readonly adapters: Map<string, BaseAdapter> = new Map();

  constructor(
    private readonly deepSeekAdapter: DeepSeekAdapter,
    private readonly fluxAdapter: FluxAdapter,
    private readonly klingImageAdapter: KlingImageAdapter,
  ) {
    this.register('deepseek-v3', deepSeekAdapter);
    this.register('flux', fluxAdapter);
    this.register('kling-image', klingImageAdapter);
  }

  private register(modelId: string, adapter: BaseAdapter) {
    this.adapters.set(modelId, adapter);
  }

  getAdapter<T extends BaseAdapter>(capability: CapabilityType, modelId: string): T {
    const adapter = this.adapters.get(modelId);
    if (!adapter) {
      throw new Error(`No adapter found for model ${modelId} with capability ${capability}`);
    }
    return adapter as T;
  }

  getLLMAdapter(modelId: string): LLMAdapter {
    return this.getAdapter<LLMAdapter>('llm', modelId);
  }

  getImageAdapter(modelId: string): ImageAdapter {
    return this.getAdapter<ImageAdapter>('image', modelId);
  }

  getVideoAdapter(modelId: string): VideoAdapter {
    return this.getAdapter<VideoAdapter>('video', modelId);
  }

  getTTSAdapter(modelId: string): TTSAdapter {
    return this.getAdapter<TTSAdapter>('tts', modelId);
  }

  /**
   * 根据能力类型获取对应的 Adapter，用于 validateKey
   */
  getAdapterByCapability(capability: CapabilityType, modelId: string): BaseAdapter {
    return this.getAdapter(capability, modelId);
  }

  /**
   * 判断某个模型是否有已注册的 Adapter
   */
  hasAdapter(modelId: string): boolean {
    return this.adapters.has(modelId);
  }
}
