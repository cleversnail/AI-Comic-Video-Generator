import { Injectable, Logger } from '@nestjs/common';
import { LLMAdapter, ImageAdapter, VideoAdapter, TTSAdapter, BaseAdapter } from './index';
import { DeepSeekAdapter } from '../../modules/models/adapters/deepseek.adapter';
import { FluxAdapter } from '../../modules/models/adapters/flux.adapter';
import { KlingImageAdapter } from '../../modules/models/adapters/kling-image.adapter';
import { KlingVideoAdapter } from '../../modules/models/adapters/kling-video.adapter';
import { DoubaoVideoAdapter } from '../../modules/models/adapters/doubao-video.adapter';
import { MiniMaxTTSAdapter } from '../../modules/models/adapters/minimax-tts.adapter';

export type CapabilityType = 'llm' | 'image' | 'video' | 'tts' | 'music' | 'sound';

interface AdapterEntry {
  adapter: BaseAdapter;
  capability: CapabilityType;
}

@Injectable()
export class AdapterFactory {
  private readonly logger = new Logger(AdapterFactory.name);
  private readonly adapters: Map<string, AdapterEntry> = new Map();

  // 默认 Adapter（按 capability）
  private readonly defaultAdapters: Map<CapabilityType, BaseAdapter>;

  constructor(
    private readonly deepSeekAdapter: DeepSeekAdapter,
    private readonly fluxAdapter: FluxAdapter,
    private readonly klingImageAdapter: KlingImageAdapter,
    private readonly klingVideoAdapter: KlingVideoAdapter,
    private readonly doubaoVideoAdapter: DoubaoVideoAdapter,
    private readonly minimaxTTSAdapter: MiniMaxTTSAdapter,
  ) {
    // 注册默认模型
    this.register('deepseek-v3', deepSeekAdapter, 'llm');
    this.register('deepseek-chat', deepSeekAdapter, 'llm');
    this.register('deepseek-r1', deepSeekAdapter, 'llm');
    this.register('flux', fluxAdapter, 'image');
    this.register('flux-1', fluxAdapter, 'image');
    this.register('kling-image', klingImageAdapter, 'image');
    this.register('kling-pro', klingVideoAdapter, 'video');
    this.register('kling-video', klingVideoAdapter, 'video');
    this.register('kling-3.0-turbo', klingVideoAdapter, 'video');
    this.register('kling-2.0', klingVideoAdapter, 'video');
    this.register('doubao', doubaoVideoAdapter, 'video');
    this.register('seedance', doubaoVideoAdapter, 'video');
    this.register('minimax-tts', minimaxTTSAdapter, 'tts');

    // 设置默认 Adapter（当用户自定义模型 ID 未注册时，按 capability 使用默认 Adapter）
    this.defaultAdapters = new Map<CapabilityType, BaseAdapter>();
    this.defaultAdapters.set('llm', deepSeekAdapter);
    this.defaultAdapters.set('image', fluxAdapter);
    this.defaultAdapters.set('video', klingVideoAdapter);
    this.defaultAdapters.set('tts', minimaxTTSAdapter);
  }

  private register(modelId: string, adapter: BaseAdapter, capability: CapabilityType) {
    this.adapters.set(modelId, { adapter, capability });
  }

  /**
   * 获取 Adapter（支持自定义模型 ID）
   * 优先查找注册表，如果未找到则根据 capability 返回默认 Adapter
   */
  getAdapter<T extends BaseAdapter>(capability: CapabilityType, modelId: string): T {
    // 1. 优先查找注册表
    const entry = this.adapters.get(modelId);
    if (entry) {
      if (entry.capability !== capability) {
        throw new Error(
          `Adapter for model ${modelId} has capability ${entry.capability}, but ${capability} was requested`,
        );
      }
      return entry.adapter as T;
    }

    // 2. 未找到注册的模型，根据 capability 返回默认 Adapter
    this.logger.warn(`Model ${modelId} not registered, using default ${capability} adapter`);
    const defaultAdapter = this.defaultAdapters.get(capability);
    if (!defaultAdapter) {
      throw new Error(`No default adapter found for capability ${capability}`);
    }
    return defaultAdapter as T;
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
