import { Test, TestingModule } from '@nestjs/testing';
import { AdapterFactory } from '../adapter.factory';
import { LLMAdapter, ImageAdapter, VideoAdapter, TTSAdapter } from '../index';

/**
 * AdapterFactory 工厂类单元测试模板
 *
 * 测试范围：
 * 1. 默认适配器注册（构造函数中注册的模型 ID 应该可以通过工厂获取）
 * 2. getAdapter 按 capability 正确路由
 * 3. 未注册模型 ID 回退到默认适配器
 * 4. capability 不匹配时抛错
 * 5. hasAdapter 判断注册状态
 *
 * 注意：这组测试使用 mock Adapter，不依赖真实 API Key。
 * 如需完整集成测试，参考 jest-e2e.json 配置 e2e 测试。
 */

// ── Mock Adapter ──────────────────────────────────

class MockLLMAdapter implements LLMAdapter {
  readonly provider = 'mock-llm';
  readonly modelId = 'mock-llm-v1';
  async validateKey() { return { valid: true }; }
  async generateText() { return { content: 'ok' }; }
}

class MockImageAdapter implements ImageAdapter {
  readonly provider = 'mock-image';
  readonly modelId = 'mock-image-v1';
  async validateKey() { return { valid: true }; }
  async generateImage() { return { url: 'http://mock/img.png' }; }
}

class MockVideoAdapter implements VideoAdapter {
  readonly provider = 'mock-video';
  readonly modelId = 'mock-video-v1';
  async validateKey() { return { valid: true }; }
  async generateVideo() { return { taskId: 't1', status: 'completed', url: 'http://mock/video.mp4' }; }
  async getVideoStatus() { return { taskId: 't1', status: 'completed' }; }
}

class MockTTSAdapter implements TTSAdapter {
  readonly provider = 'mock-tts';
  readonly modelId = 'mock-tts-v1';
  async validateKey() { return { valid: true }; }
  async generateSpeech() { return { audioUrl: 'http://mock/audio.mp3' }; }
}

// ── 辅助：构建带 mock 的 Factory ──────────────────

function createFactory(): AdapterFactory {
  // 使用反射绕过 NestJS DI，直接构造（纯单元测试不需要 Test.createTestingModule）
  const factory = Object.create(AdapterFactory.prototype) as AdapterFactory;

  // 初始化 private 字段（通过 any 访问）
  const anyFactory = factory as any;
  anyFactory.logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
  anyFactory.adapters = new Map();
  anyFactory.defaultAdapters = new Map();

  const llm = new MockLLMAdapter();
  const image = new MockImageAdapter();
  const video = new MockVideoAdapter();
  const tts = new MockTTSAdapter();

  // 手动注册模型（模拟构造函数逻辑）
  const register = (modelId: string, adapter: any, capability: string) => {
    anyFactory.adapters.set(modelId, { adapter, capability });
  };

  register('deepseek-v3', llm, 'llm');
  register('deepseek-r1', llm, 'llm');
  register('flux', image, 'image');
  register('flux-1', image, 'image');
  register('kling-video', video, 'video');
  register('kling-pro', video, 'video');
  register('minimax-tts', tts, 'tts');

  anyFactory.defaultAdapters.set('llm', llm);
  anyFactory.defaultAdapters.set('image', image);
  anyFactory.defaultAdapters.set('video', video);
  anyFactory.defaultAdapters.set('tts', tts);

  return factory;
}

// ── 测试 ──────────────────────────────────────────

describe('AdapterFactory', () => {
  let factory: AdapterFactory;

  beforeEach(() => {
    factory = createFactory();
  });

  describe('getAdapter - 注册表命中', () => {
    it('已注册的 LLM 模型能获取到 LLMAdapter', () => {
      const adapter = factory.getLLMAdapter('deepseek-v3');
      expect(adapter).toBeInstanceOf(MockLLMAdapter);
    });

    it('已注册的 Image 模型能获取到 ImageAdapter', () => {
      const adapter = factory.getImageAdapter('flux');
      expect(adapter).toBeInstanceOf(MockImageAdapter);
    });

    it('已注册的 Video 模型能获取到 VideoAdapter', () => {
      const adapter = factory.getVideoAdapter('kling-video');
      expect(adapter).toBeInstanceOf(MockVideoAdapter);
    });

    it('已注册的 TTS 模型能获取到 TTSAdapter', () => {
      const adapter = factory.getTTSAdapter('minimax-tts');
      expect(adapter).toBeInstanceOf(MockTTSAdapter);
    });
  });

  describe('getAdapter - capability 不匹配', () => {
    it('用 image capability 请求 llm 注册的模型应抛错', () => {
      expect(() => factory.getImageAdapter('deepseek-v3')).toThrow(
        /has capability llm, but image was requested/,
      );
    });

    it('用 video capability 请求 image 注册的模型应抛错', () => {
      expect(() => factory.getVideoAdapter('flux')).toThrow(
        /has capability image, but video was requested/,
      );
    });
  });

  describe('getAdapter - 默认回退', () => {
    it('未注册的模型 ID 回退到对应 capability 的默认适配器', () => {
      // 'custom-llm-model' 未注册，但 llm 默认适配器已设置
      const adapter = factory.getLLMAdapter('custom-llm-model');
      expect(adapter).toBeInstanceOf(MockLLMAdapter);
    });

    it('回退时应该打印 warn 日志', () => {
      factory.getLLMAdapter('unknown-model-id');
      // 验证 logger.warn 被调用（通过 any 访问）
      const anyFactory = factory as any;
      expect(anyFactory.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not registered'),
      );
    });
  });

  describe('hasAdapter', () => {
    it('已注册的模型返回 true', () => {
      expect(factory.hasAdapter('deepseek-v3')).toBe(true);
      expect(factory.hasAdapter('flux')).toBe(true);
    });

    it('未注册的模型返回 false', () => {
      expect(factory.hasAdapter('nonexistent-model')).toBe(false);
    });
  });

  describe('适配器共享特性', () => {
    it('同一个 adapter 实例可以服务多个 modelId', () => {
      // deepseek-v3 和 deepseek-r1 都映射到同一个 MockLLMAdapter
      const a1 = factory.getLLMAdapter('deepseek-v3');
      const a2 = factory.getLLMAdapter('deepseek-r1');
      expect(a1).toBe(a2); // 同一个实例
    });

    it('不同 capability 的 adapter 是不同实例', () => {
      const llm = factory.getLLMAdapter('deepseek-v3');
      const image = factory.getImageAdapter('flux');
      expect(llm).not.toBe(image);
      expect(llm.provider).not.toBe(image.provider);
    });
  });
});
