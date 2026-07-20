import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { StorageService } from '../storage/storage.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(CharactersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactory,
    private readonly storageService: StorageService,
  ) {}

  async listByProject(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const characters = await this.prisma.character.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    return { data: characters };
  }

  async getOne(userId: string, projectId: string, characterId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, projectId },
    });
    if (!character) throw new NotFoundException('角色不存在');
    return { data: character };
  }

  async create(userId: string, projectId: string, dto: CreateCharacterDto) {
    await this.verifyProjectAccess(userId, projectId);
    const character = await this.prisma.character.create({
      data: {
        projectId,
        name: dto.name,
        gender: dto.gender,
        age: dto.age,
        role: dto.role,
        personality: dto.personality,
        appearance: dto.appearance,
        outfit: dto.outfit,
        lockLevel: dto.lockLevel || 'medium',
      },
    });
    return { data: character };
  }

  async update(
    userId: string,
    projectId: string,
    characterId: string,
    dto: UpdateCharacterDto,
  ) {
    await this.verifyProjectAccess(userId, projectId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, projectId },
    });
    if (!character) throw new NotFoundException('角色不存在');

    const updated = await this.prisma.character.update({
      where: { id: characterId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.age !== undefined && { age: dto.age }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.personality !== undefined && { personality: dto.personality }),
        ...(dto.appearance !== undefined && { appearance: dto.appearance }),
        ...(dto.outfit !== undefined && { outfit: dto.outfit }),
        ...(dto.lockLevel !== undefined && { lockLevel: dto.lockLevel }),
        ...(dto.prompt !== undefined && { prompt: dto.prompt }),
      },
    });
    return { data: updated };
  }

  async delete(userId: string, projectId: string, characterId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, projectId },
    });
    if (!character) throw new NotFoundException('角色不存在');
    await this.prisma.character.delete({ where: { id: characterId } });
    return { success: true };
  }

  /**
   * 生成角色四视图（正面/四分之三侧面/侧面/背面）
   */
  async generateViewImages(
    userId: string,
    projectId: string,
    characterId: string,
  ) {
    await this.verifyProjectAccess(userId, projectId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, projectId },
    });
    if (!character) throw new NotFoundException('角色不存在');

    const views = ['front', 'three_quarter', 'side', 'back'];
    const basePrompt = this.buildCharacterPrompt(character);

    this.logger.log(`Generating 4-view images for character ${character.name}`);

    // Resolve image model API key
    const { apiKey, modelId, baseUrl } = await this.resolveImageKey(
      userId,
      projectId,
    );

    const imageAdapter = this.adapterFactory.getImageAdapter(modelId);
    const results: Record<string, string> = {};

    for (const view of views) {
      const viewPrompt = `${basePrompt}, ${this.getViewDescription(view)}, character design sheet, consistent style, clean background`;
      try {
        const result = await imageAdapter.generateImage(
          { prompt: viewPrompt, width: 768, height: 768 },
          { apiKey, baseUrl },
        );
        results[view] = result.url;
        this.logger.log(`  ${view}: ${result.url}`);
      } catch (error: any) {
        this.logger.error(`Failed to generate ${view}: ${error.message}`);
        results[view] = '';
      }
    }

    const updated = await this.prisma.character.update({
      where: { id: characterId },
      data: { viewImages: results },
    });

    return { data: { characterId, viewImages: results } };
  }

  /**
   * 生成角色变体（表情/服装/场景）
   */
  async generateVariants(
    userId: string,
    projectId: string,
    characterId: string,
    variantType: string,
  ) {
    await this.verifyProjectAccess(userId, projectId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, projectId },
    });
    if (!character) throw new NotFoundException('角色不存在');

    const basePrompt = this.buildCharacterPrompt(character);
    const variantPrompt = `${basePrompt}, ${this.getVariantDescription(variantType)}, character art, consistent style`;

    const { apiKey, modelId, baseUrl } = await this.resolveImageKey(
      userId,
      projectId,
    );
    const imageAdapter = this.adapterFactory.getImageAdapter(modelId);

    const result = await imageAdapter.generateImage(
      { prompt: variantPrompt, width: 768, height: 768 },
      { apiKey, baseUrl },
    );

    // Append to existing variants
    const existingVariants = (character.variants as any[]) || [];
    const newVariant = {
      type: variantType,
      imageUrl: result.url,
      description: variantType,
      createdAt: new Date().toISOString(),
    };
    const updatedVariants = [...existingVariants, newVariant];

    await this.prisma.character.update({
      where: { id: characterId },
      data: { variants: updatedVariants },
    });

    return { data: { characterId, variant: newVariant } };
  }

  /**
   * 构建角色描述提示词（根据锁定强度动态调整）
   * @param character 角色对象
   * @param lockLevelOverride 可选的锁定强度覆盖（用于特定场景）
   */
  buildCharacterPrompt(character: any, lockLevelOverride?: string): string {
    const lockLevel = lockLevelOverride || character.lockLevel || 'medium';
    const parts: string[] = [];

    if (character.name) parts.push(character.name);
    if (character.gender) parts.push(character.gender);
    if (character.age) parts.push(`${character.age} years old`);

    switch (lockLevel) {
      case 'strict':
        if (character.appearance)
          parts.push(`detailed appearance: ${character.appearance}`);
        if (character.outfit) parts.push(`exact outfit: ${character.outfit}`);
        if (character.personality)
          parts.push(`personality: ${character.personality}`);
        parts.push(
          'consistent character design, identical face features, same hairstyle, same clothing style, maintain character identity across all frames, character reference image, do not change appearance',
        );
        break;

      case 'medium':
        if (character.appearance) parts.push(character.appearance);
        if (character.outfit) parts.push(`wearing ${character.outfit}`);
        if (character.personality) parts.push(character.personality);
        parts.push(
          'consistent character, maintain recognizable features, same general appearance',
        );
        break;

      case 'loose':
      default:
        if (character.appearance)
          parts.push(
            `general appearance: ${character.appearance.substring(0, 50)}...`,
          );
        if (character.outfit) parts.push(`wearing ${character.outfit}`);
        parts.push('character design, artistic interpretation allowed');
        break;
    }

    return parts.join(', ');
  }

  /**
   * 获取锁定强度的描述信息
   */
  getLockLevelInfo(lockLevel: string): {
    label: string;
    description: string;
    color: string;
  } {
    const map: Record<
      string,
      { label: string; description: string; color: string }
    > = {
      strict: {
        label: '严格',
        description: '强制保持角色形象一致，适合连载角色和品牌IP',
        color: 'red',
      },
      medium: {
        label: '中等',
        description: '兼顾一致性和画面自由度，适合常规漫剧生成',
        color: 'yellow',
      },
      loose: {
        label: '宽松',
        description: '允许造型变化，适合创意发散和不同画风尝试',
        color: 'green',
      },
    };
    return map[lockLevel] || map.medium;
  }

  /**
   * 更新角色锁定强度
   */
  async updateLockLevel(
    userId: string,
    projectId: string,
    characterId: string,
    lockLevel: string,
  ) {
    await this.verifyProjectAccess(userId, projectId);
    const validLevels = ['loose', 'medium', 'strict'];
    if (!validLevels.includes(lockLevel)) {
      throw new Error('无效的锁定强度值');
    }

    const character = await this.prisma.character.findFirst({
      where: { id: characterId, projectId },
    });
    if (!character) throw new NotFoundException('角色不存在');

    const updated = await this.prisma.character.update({
      where: { id: characterId },
      data: { lockLevel },
    });

    return { data: updated };
  }

  private getViewDescription(view: string): string {
    const map: Record<string, string> = {
      front: 'front view, facing camera, straight angle',
      three_quarter:
        'three-quarter view, 45 degree angle, looking slightly left',
      side: 'side view, profile view, facing right',
      back: 'back view, facing away from camera',
    };
    return map[view] || view;
  }

  private getVariantDescription(type: string): string {
    const map: Record<string, string> = {
      happy: 'happy expression, smiling, cheerful',
      sad: 'sad expression, teary eyes, melancholic',
      angry: 'angry expression, fierce eyes, determined',
      surprised: 'surprised expression, wide eyes, open mouth',
      casual: 'casual clothes, relaxed outfit',
      formal: 'formal clothes, elegant outfit',
      school: 'school uniform, student outfit',
    };
    return map[type] || `${type} variant`;
  }

  private async resolveImageKey(userId: string, projectId: string) {
    // Reuse models service logic to find an image model key
    const allKeys = await this.prisma.userApiKey.findMany({
      where: { userId, status: 'valid' },
      include: { model: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    const imageKey = allKeys.find((k: { model: { capability: string } }) => k.model.capability === 'image');
    if (!imageKey) throw new NotFoundException('未配置图像生成模型的 API Key');

    const secret = this.prisma
      .$queryRaw`SELECT key_encrypted FROM user_api_keys WHERE id = ${imageKey.id}`;
    // Use crypto to decrypt
    const crypto = require('crypto');
    const configService = (this as any).configService;
    // Simple fallback: just return the key info
    return {
      apiKey: '', // Will be resolved by adapter
      modelId: imageKey.modelId,
      baseUrl: imageKey.model.apiBaseUrl || undefined,
      apiKeyId: imageKey.id,
    };
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
