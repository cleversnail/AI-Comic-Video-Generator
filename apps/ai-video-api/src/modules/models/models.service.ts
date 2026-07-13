import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../common/user.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateModelPreferenceDto } from './dto/update-model-preference.dto';

@Injectable()
export class ModelsService {
  private readonly logger = new Logger(ModelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactory,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async listModels(capability?: string) {
    const where = capability ? { capability } : {};
    const models = await this.prisma.aIModel.findMany({
      where,
      orderBy: [{ capability: 'asc' }, { name: 'asc' }],
    });

    return {
      data: models.map((model) => ({
        ...model,
        // 不返回完整计费规则细节，只保留基础信息
      })),
    };
  }

  async getModel(id: string) {
    const model = await this.prisma.aIModel.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException(`Model ${id} not found`);
    }

    return { data: model };
  }

  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    this.logger.log(`Creating API key for model ${dto.modelId}, user ${userId}`);

    // 临时方案：确保用户存在
    await this.userService.ensureUserExists(userId);

    const model = await this.prisma.aIModel.findUnique({
      where: { id: dto.modelId },
    });

    if (!model) {
      throw new NotFoundException(`Model ${dto.modelId} not found`);
    }

    // 根据能力类型获取对应 Adapter 验证 Key
    let validationResult;
    try {
      switch (model.capability) {
        case 'llm':
          validationResult = await this.adapterFactory.getLLMAdapter(dto.modelId).validateKey(dto.apiKey);
          break;
        case 'image':
          if (this.adapterFactory.hasAdapter(dto.modelId)) {
            validationResult = await this.adapterFactory.getImageAdapter(dto.modelId).validateKey(dto.apiKey);
          } else {
            validationResult = { valid: dto.apiKey.length > 10, message: '基础格式验证通过' };
          }
          break;
        default:
          // 对于尚未实现 Adapter 的模型，只做基础格式验证
          validationResult = { valid: dto.apiKey.length > 10, message: '基础格式验证通过' };
      }
    } catch (error: any) {
      this.logger.error(`Validation error: ${error.message}`, error.stack);
      validationResult = { valid: false, message: error.message };
    }

    if (!validationResult.valid) {
      throw new BadRequestException(validationResult.message || 'API Key 验证失败');
    }

    // 如果设置为默认，先取消其他默认
    if (dto.isDefault) {
      await this.prisma.userApiKey.updateMany({
        where: { userId, modelId: dto.modelId },
        data: { isDefault: false },
      });
    }

    // AES-256-GCM 加密存储 Key
    const keyEncrypted = this.encryptApiKey(dto.apiKey);
    const keyMask = `${dto.apiKey.slice(0, 4)}****${dto.apiKey.slice(-4)}`;

    const apiKey = await this.prisma.userApiKey.create({
      data: {
        userId,
        modelId: dto.modelId,
        alias: dto.alias || `${model.name} Key`,
        keyEncrypted,
        keyMask,
        status: 'valid',
        isDefault: dto.isDefault ?? true,
        lastVerifiedAt: new Date(),
      },
    });

    return {
      data: {
        id: apiKey.id,
        modelId: apiKey.modelId,
        alias: apiKey.alias,
        keyMask: apiKey.keyMask,
        status: apiKey.status,
        isDefault: apiKey.isDefault,
        lastVerifiedAt: apiKey.lastVerifiedAt,
      },
    };
  }

  async listUserApiKeys(userId: string, capability?: string) {
    const apiKeys = await this.prisma.userApiKey.findMany({
      where: { userId },
      include: { model: true },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = capability
      ? apiKeys.filter((key) => key.model.capability === capability)
      : apiKeys;

    return {
      data: filtered.map((key) => ({
        id: key.id,
        modelId: key.modelId,
        modelName: key.model.name,
        capability: key.model.capability,
        alias: key.alias,
        keyMask: key.keyMask,
        status: key.status,
        isDefault: key.isDefault,
        totalCalls: key.totalCalls,
        estimatedCost: key.estimatedCost,
        lastVerifiedAt: key.lastVerifiedAt,
      })),
    };
  }

  async deleteApiKey(userId: string, id: string) {
    const key = await this.prisma.userApiKey.findFirst({
      where: { id, userId },
    });

    if (!key) {
      throw new NotFoundException('API Key not found');
    }

    await this.prisma.userApiKey.delete({
      where: { id },
    });

    return { success: true };
  }

  async getProjectPreference(userId: string, projectId: string) {
    const preference = await this.prisma.modelPreference.findUnique({
      where: { projectId },
    });

    if (!preference) {
      return { data: null };
    }

    return { data: preference };
  }

  async updateProjectPreference(userId: string, dto: UpdateModelPreferenceDto) {
    // 验证 project 存在且属于用户
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const preference = await this.prisma.modelPreference.upsert({
      where: { projectId: dto.projectId },
      update: {
        defaults: dto.defaults,
      },
      create: {
        projectId: dto.projectId,
        defaults: dto.defaults,
      },
    });

    return { data: preference };
  }

  async getDecryptedApiKey(userId: string, apiKeyId: string): Promise<string> {
    const key = await this.prisma.userApiKey.findFirst({
      where: { id: apiKeyId, userId },
    });

    if (!key) {
      throw new NotFoundException('API Key not found');
    }

    return this.decryptApiKey(key.keyEncrypted);
  }

 private encryptApiKey(apiKey: string): string {
    const secret = this.configService.get<string>('ENCRYPTION_KEY');
    if (!secret) {
      throw new Error('ENCRYPTION_KEY is not configured. API Key encryption requires a dedicated secret.');
    }
    // Derive a 32-byte key from the secret
    const key = crypto.scryptSync(secret, 'ai-video-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decryptApiKey(encryptedData: string): string {
    const secret = this.configService.get<string>('ENCRYPTION_KEY');
    if (!secret) {
      throw new Error('ENCRYPTION_KEY is not configured. API Key decryption requires a dedicated secret.');
    }
    const key = crypto.scryptSync(secret, 'ai-video-salt', 32);
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async resolveApiKey(userId: string, projectId: string, capability: string): Promise<{ apiKey: string; modelId: string; baseUrl?: string }> {
    // 1. 先查项目级配置
    let preference = await this.prisma.modelPreference.findUnique({
      where: { projectId },
    });

    // 2. 如果没有项目级配置，查全局默认（这里简化为查用户该能力第一个可用的 Key）
    let modelId: string | undefined;
    let apiKeyId: string | undefined;

    if (preference?.defaults && typeof preference.defaults === 'object') {
      const defaults = preference.defaults as Record<string, any>;
      const config = defaults[capability];
      if (config) {
        modelId = config.modelId;
        apiKeyId = config.apiKeyId;
      }
    }

    if (!modelId) {
      // 查找用户该能力的默认 Key
      const allKeys = await this.prisma.userApiKey.findMany({
        where: { userId, status: 'valid' },
        include: { model: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      const defaultKey = allKeys.find((key) => key.model.capability === capability);

      if (!defaultKey) {
        throw new BadRequestException(`未找到 ${capability} 能力的可用模型和 API Key，请先配置`);
      }

      modelId = defaultKey.modelId;
      apiKeyId = defaultKey.id;
    }

    if (!apiKeyId) {
      // 查找该模型的默认 Key
      const defaultKey = await this.prisma.userApiKey.findFirst({
        where: { userId, modelId, status: 'valid' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      if (!defaultKey) {
        throw new BadRequestException(`未找到模型 ${modelId} 的有效 API Key`);
      }

      apiKeyId = defaultKey.id;
    }

    const apiKey = await this.getDecryptedApiKey(userId, apiKeyId);
    const model = await this.prisma.aIModel.findUnique({ where: { id: modelId } });

    return {
      apiKey,
      modelId,
      baseUrl: model?.apiBaseUrl || undefined,
    };
  }
}
