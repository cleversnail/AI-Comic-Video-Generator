import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const models = [
  {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3',
    provider: 'DeepSeek',
    capability: 'llm',
    description: '深度求索出品的大语言模型，中文理解能力强，成本低，适合剧情润色、分镜拆分、提示词优化。',
    docUrl: 'https://platform.deepseek.com/api_docs/',
    pricingUrl: 'https://platform.deepseek.com/api_docs/pricing/',
    apiBaseUrl: 'https://api.deepseek.com',
    parameters: [
      { key: 'temperature', name: '温度', type: 'number', defaultValue: 0.7, min: 0, max: 2 },
      { key: 'maxTokens', name: '最大 Token', type: 'number', defaultValue: 2000, min: 100, max: 8000 },
    ],
    supports: {},
    status: 'active',
    billingUnit: 'token',
    billingRule: { unitPrice: 0.001, currency: 'CNY', unit: '1K tokens' },
  },
  {
    id: 'kimi',
    name: 'Kimi',
    provider: 'Moonshot',
    capability: 'llm',
    description: '月之暗面出品的大语言模型，长文本处理能力突出，适合处理长篇小说和剧本。',
    docUrl: 'https://platform.moonshot.cn/docs/',
    pricingUrl: 'https://platform.moonshot.cn/docs/pricing/',
    apiBaseUrl: 'https://api.moonshot.cn',
    parameters: [
      { key: 'temperature', name: '温度', type: 'number', defaultValue: 0.7, min: 0, max: 2 },
      { key: 'maxTokens', name: '最大 Token', type: 'number', defaultValue: 2000, min: 100, max: 8000 },
    ],
    supports: {},
    status: 'active',
    billingUnit: 'token',
    billingRule: { unitPrice: 0.012, currency: 'CNY', unit: '1K tokens' },
  },
  {
    id: 'flux',
    name: 'FLUX.1',
    provider: 'Black Forest Labs',
    capability: 'image',
    description: 'Black Forest Labs 出品的图像生成模型，画面质量高，细节丰富，适合生成角色图和分镜预览图。',
    docUrl: 'https://replicate.com/black-forest-labs/flux-1.1-pro-ultra/docs',
    pricingUrl: 'https://replicate.com/black-forest-labs/flux-1.1-pro-ultra/pricing',
    apiBaseUrl: 'https://api.replicate.com',
    parameters: [
      { key: 'width', name: '宽度', type: 'select', defaultValue: 1024, options: [{ label: '1024', value: 1024 }, { label: '768', value: 768 }] },
      { key: 'height', name: '高度', type: 'select', defaultValue: 1024, options: [{ label: '1024', value: 1024 }, { label: '1344', value: 1344 }] },
    ],
    supports: { referenceImage: true },
    status: 'active',
    billingUnit: 'image',
    billingRule: { unitPrice: 0.04, currency: 'USD', unit: 'per image' },
  },
  {
    id: 'jimeng',
    name: '即梦',
    provider: 'ByteDance',
    capability: 'image',
    description: '字节跳动出品的图像生成模型，中文提示词理解好，适合国风、动漫等风格。',
    docUrl: 'https://jimeng.jianying.com/',
    pricingUrl: 'https://jimeng.jianying.com/',
    apiBaseUrl: '',
    parameters: [
      { key: 'ratio', name: '比例', type: 'select', defaultValue: '9:16', options: [{ label: '9:16', value: '9:16' }, { label: '16:9', value: '16:9' }, { label: '1:1', value: '1:1' }] },
    ],
    supports: { referenceImage: true },
    status: 'active',
    billingUnit: 'image',
    billingRule: { unitPrice: 0.1, currency: 'CNY', unit: 'per image' },
  },
  {
    id: 'kling-pro',
    name: '可灵 Kling Pro',
    provider: 'Kling',
    capability: 'video',
    description: '快手出品的视频生成模型，国内可用性强，运动表现和自然度较好，适合生成漫剧视频片段。',
    docUrl: 'https://klingai.com/',
    pricingUrl: 'https://klingai.com/',
    apiBaseUrl: '',
    parameters: [
      { key: 'duration', name: '时长', type: 'select', defaultValue: 5, options: [{ label: '5秒', value: 5 }, { label: '10秒', value: 10 }] },
      { key: 'resolution', name: '分辨率', type: 'select', defaultValue: '1080p', options: [{ label: '1080p', value: '1080p' }, { label: '720p', value: '720p' }] },
      { key: 'movement', name: '运动幅度', type: 'select', defaultValue: 'medium', options: [{ label: '低', value: 'low' }, { label: '中', value: 'medium' }, { label: '高', value: 'high' }] },
    ],
    supports: { firstFrame: true, lastFrame: true },
    status: 'active',
    billingUnit: 'second',
    billingRule: { unitPrice: 0.1, currency: 'CNY', unit: 'per second' },
  },
  {
    id: 'doubao',
    name: '豆包 PixelDance',
    provider: 'ByteDance',
    capability: 'video',
    description: '字节跳动出品的视频生成模型，对中文提示词理解好，适合国内创作者使用。',
    docUrl: 'https://www.volcengine.com/docs/',
    pricingUrl: 'https://www.volcengine.com/docs/',
    apiBaseUrl: '',
    parameters: [
      { key: 'duration', name: '时长', type: 'select', defaultValue: 5, options: [{ label: '5秒', value: 5 }, { label: '10秒', value: 10 }] },
      { key: 'resolution', name: '分辨率', type: 'select', defaultValue: '1080p', options: [{ label: '1080p', value: '1080p' }, { label: '720p', value: '720p' }] },
    ],
    supports: { firstFrame: true },
    status: 'active',
    billingUnit: 'second',
    billingRule: { unitPrice: 0.08, currency: 'CNY', unit: 'per second' },
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    provider: 'ElevenLabs',
    capability: 'tts',
    description: '业界领先的语音合成模型，音色自然，支持多语言和情绪控制，适合配音和旁白。',
    docUrl: 'https://elevenlabs.io/docs',
    pricingUrl: 'https://elevenlabs.io/pricing',
    apiBaseUrl: 'https://api.elevenlabs.io',
    parameters: [
      { key: 'voiceId', name: '音色', type: 'string', defaultValue: '21m00Tcm4TlvDq8ikWAM' },
      { key: 'stability', name: '稳定性', type: 'number', defaultValue: 0.5, min: 0, max: 1 },
    ],
    supports: {},
    status: 'active',
    billingUnit: 'token',
    billingRule: { unitPrice: 0.08, currency: 'USD', unit: '1K chars' },
  },
  {
    id: 'minimax-tts',
    name: 'MiniMax TTS',
    provider: 'MiniMax',
    capability: 'tts',
    description: 'MiniMax 出品的语音合成模型，中文效果好，音色丰富，适合中文漫剧配音。',
    docUrl: 'https://platform.minimaxi.com/',
    pricingUrl: 'https://platform.minimaxi.com/',
    apiBaseUrl: 'https://api.minimaxi.chat',
    parameters: [
      { key: 'voiceId', name: '音色', type: 'string', defaultValue: 'male-qn-qingse' },
    ],
    supports: {},
    status: 'active',
    billingUnit: 'token',
    billingRule: { unitPrice: 0.015, currency: 'CNY', unit: '1K chars' },
  },
];

async function main() {
  console.log('🌱 Seeding AI models...');

  for (const model of models) {
    await prisma.aIModel.upsert({
      where: { id: model.id },
      update: model,
      create: model,
    });
  }

  console.log(`✅ Seeded ${models.length} models`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
