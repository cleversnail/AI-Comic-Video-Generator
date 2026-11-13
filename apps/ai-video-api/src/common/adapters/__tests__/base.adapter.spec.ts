import { BaseAdapter, KeyValidationResult } from '../base.adapter';
import { LLMAdapter, LLMInput, LLMResult } from '../llm.adapter';
import { ImageAdapter, ImageInput, ImageResult } from '../image.adapter';

/**
 * BaseAdapter 接口单元测试模板
 *
 * 这组测试验证适配器接口的契约一致性，确保所有实现类满足：
 * 1. 必须声明 provider 和 modelId 只读属性
 * 2. validateKey 必须返回 KeyValidationResult 结构
 * 3. 失败时返回 valid: false + 错误消息，而非抛异常
 *
 * 新增 Adapter 时，在下方 createMockAdapters 中补充对应 mock 即可。
 */

// ── Mock 实现 ──────────────────────────────────────

class MockLLMAdapter implements LLMAdapter {
  readonly provider = 'mock-llm';
  readonly modelId = 'mock-model-v1';

  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    if (!apiKey || apiKey.length < 10) {
      return { valid: false, message: 'API Key 无效：长度不足' };
    }
    if (apiKey === 'invalid-key') {
      return { valid: false, message: 'API Key 无效：被吊销' };
    }
    return { valid: true, balance: 9999 };
  }

  async generateText(input: LLMInput, _config: { apiKey: string }): Promise<LLMResult> {
    if (!input.messages || input.messages.length === 0) {
      throw new Error('messages 不能为空');
    }
    return { content: 'mock response', usage: { totalTokens: 42 } };
  }
}

class MockImageAdapter implements ImageAdapter {
  readonly provider = 'mock-image';
  readonly modelId = 'mock-image-v1';

  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    if (!apiKey) {
      return { valid: false, message: 'API Key 不能为空' };
    }
    return { valid: true };
  }

  async generateImage(input: ImageInput, _config: { apiKey: string }): Promise<ImageResult> {
    if (!input.prompt) {
      throw new Error('prompt 不能为空');
    }
    return { url: 'https://mock.cdn/image.png', width: 1024, height: 1024 };
  }
}

const createMockAdapters = () => ({
  llm: new MockLLMAdapter(),
  image: new MockImageAdapter(),
});

// ── BaseAdapter 契约测试 ────────────────────────────

describe('BaseAdapter 接口契约', () => {
  let adapters: ReturnType<typeof createMockAdapters>;

  beforeEach(() => {
    adapters = createMockAdapters();
  });

  describe('属性约束', () => {
    it('所有适配器必须有 provider 属性', () => {
      expect(adapters.llm.provider).toBe('mock-llm');
      expect(typeof adapters.llm.provider).toBe('string');
    });

    it('所有适配器必须有 modelId 属性', () => {
      expect(adapters.llm.modelId).toBe('mock-model-v1');
      expect(typeof adapters.llm.modelId).toBe('string');
    });

    it('不同能力的适配器 provider 应该不同', () => {
      expect(adapters.llm.provider).not.toBe(adapters.image.provider);
    });
  });

  describe('validateKey 契约', () => {
    it('有效 Key 返回 valid: true', async () => {
      const result = await adapters.llm.validateKey('sk-valid-key-12345');
      expect(result).toMatchObject({ valid: true });
    });

    it('无效 Key 返回 valid: false + message', async () => {
      const result = await adapters.llm.validateKey('');
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('被吊销的 Key 返回明确错误信息', async () => {
      const result = await adapters.llm.validateKey('invalid-key');
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/无效/);
    });

    it('返回结构必须是 KeyValidationResult', async () => {
      const result = await adapters.llm.validateKey('sk-valid-key-12345');
      // 使用类型守卫验证
      const isKeyValidationResult = (r: any): r is KeyValidationResult =>
        typeof r?.valid === 'boolean';
      expect(isKeyValidationResult(result)).toBe(true);
    });
  });
});

// ── LLMAdapter 扩展测试 ────────────────────────────

describe('LLMAdapter 扩展契约', () => {
  let adapter: MockLLMAdapter;

  beforeEach(() => {
    adapter = new MockLLMAdapter();
  });

  it('generateText 必须接受 LLMInput 参数', async () => {
    const input: LLMInput = {
      messages: [
        { role: 'system', content: '你是助手' },
        { role: 'user', content: '你好' },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    };
    const result = await adapter.generateText(input, { apiKey: 'sk-test' });
    expect(result.content).toBeDefined();
  });

  it('generateText 返回 LLMResult 结构', async () => {
    const result = await adapter.generateText(
      { messages: [{ role: 'user', content: 'hi' }] },
      { apiKey: 'sk-test' },
    );
    expect(result).toHaveProperty('content');
    expect(typeof result.content).toBe('string');
  });

  it('空 messages 应该抛错', async () => {
    await expect(
      adapter.generateText({ messages: [] }, { apiKey: 'sk-test' }),
    ).rejects.toThrow();
  });
});

// ── ImageAdapter 扩展测试 ───────────────────────────

describe('ImageAdapter 扩展契约', () => {
  let adapter: MockImageAdapter;

  beforeEach(() => {
    adapter = new MockImageAdapter();
  });

  it('generateImage 接受 ImageInput 参数', async () => {
    const input: ImageInput = {
      prompt: '一只猫在月光下',
      negativePrompt: '模糊、变形',
      width: 1024,
      height: 1024,
    };
    const result = await adapter.generateImage(input, { apiKey: 'sk-test' });
    expect(result.url).toBeDefined();
  });

  it('返回 ImageResult 结构', async () => {
    const result = await adapter.generateImage(
      { prompt: 'test' },
      { apiKey: 'sk-test' },
    );
    expect(result).toHaveProperty('url');
  });

  it('空 prompt 应该抛错', async () => {
    await expect(
      adapter.generateImage({ prompt: '' }, { apiKey: 'sk-test' }),
    ).rejects.toThrow();
  });
});
