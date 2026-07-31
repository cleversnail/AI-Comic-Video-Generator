import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { GeneratePreviewDto } from './dto/generate-preview.dto';

@Injectable()
export class StoryboardPreviewService {
  private readonly logger = new Logger(StoryboardPreviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  async generatePreview(userId: string, projectId: string, shotId: string, dto: GeneratePreviewDto) {
    await this.verifyProjectAccess(userId, projectId);

    const shot = await this.prisma.shot.findFirst({ where: { id: shotId, projectId } });
    if (!shot) throw new NotFoundException('Shot not found');

    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'image');

    const params = shot.params as any;
    const originalPrompt = dto.customPrompt || shot.prompt || params?.description || '';
    if (!originalPrompt) throw new BadRequestException('该分镜没有提示词，无法生成预览');

    // 获取角色信息和参考图
    const { characterPrompt, referenceImage, characterCount } = await this.buildCharacterDataForShot(projectId, params?.characterIds || []);

    // 构建最终提示词：角色描述 + 原始场景描述 + 构图指导
    const promptParts: string[] = [];

    // 1. 角色描述（如果有）
    if (characterPrompt) {
      promptParts.push(characterPrompt);
    }

    // 2. 原始场景描述（保留用户输入的画面描述细节）
    promptParts.push(originalPrompt);

    // 3. 构图指导（多人场景时确保所有人都在画面中）
    if (characterCount > 1) {
      promptParts.push(`show all ${characterCount} characters clearly in the scene, group composition, all characters visible`);
    }

    // 4. 质量控制
    promptParts.push('high quality, detailed, cinematic lighting, anime style');

    const finalPrompt = promptParts.join(', ');

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const dimensions = this.getDimensionsByAspectRatio(project?.aspectRatio || '9:16');

    this.logger.log(`Generating preview for shot ${shotId} using ${modelId}${referenceImage ? ' with reference image' : ''}`);
    this.logger.log(`Final prompt: ${finalPrompt.substring(0, 200)}...`);

    let imageUrl: string;
    try {
      const imageAdapter = this.adapterFactory.getImageAdapter(modelId);
      const result = await imageAdapter.generateImage(
        {
          prompt: finalPrompt,
          negativePrompt: shot.negativePrompt || 'blurry, deformed, low quality, missing limbs, extra limbs',
          width: dimensions.width,
          height: dimensions.height,
          referenceImage: referenceImage || undefined,
        },
        { apiKey, baseUrl }
      );
      imageUrl = result.url;
    } catch (error: any) {
      this.logger.error(`Preview generation failed: ${error.message}`);
      throw new BadRequestException(`预览图生成失败: ${error.message}`);
    }

    await this.prisma.shot.update({
      where: { id: shotId },
      data: { resultUrl: imageUrl, status: 'previewed' },
    });

    return { data: { shotId, previewUrl: imageUrl, status: 'previewed' } };
  }

  /**
   * 构建角色提示词和参考图
   */
  private async buildCharacterDataForShot(
    projectId: string,
    characterIds: string[],
  ): Promise<{ characterPrompt: string; referenceImage: string | null; characterCount: number }> {
    if (!characterIds?.length) return { characterPrompt: '', referenceImage: null, characterCount: 0 };

    const characters = await this.prisma.character.findMany({
      where: { projectId, id: { in: characterIds } },
    });

    if (characters.length === 0) return { characterPrompt: '', referenceImage: null, characterCount: 0 };

    const characterDescriptions: string[] = [];
    let referenceImage: string | null = null;

    for (const character of characters) {
      const parts: string[] = [character.name];

      // 外貌特征
      if (character.appearance) parts.push(character.appearance);
      if (character.outfit) parts.push(`wearing ${character.outfit}`);

      // 锁定强度
      const lockLevel = character.lockLevel || 'medium';
      if (lockLevel === 'strict') {
        parts.push('identical to reference');
      }

      // 优先使用主图作为参考
      if (!referenceImage) {
        if (character.mainImage) {
          referenceImage = character.mainImage;
        } else if (character.viewImages) {
          const viewImages = character.viewImages as any;
          if (viewImages?.front) {
            referenceImage = viewImages.front;
          }
        }
      }

      characterDescriptions.push(parts.join(', '));
    }

    // 构建角色描述：将每个角色作为独立的实体描述
    const characterPrompt = characterDescriptions
      .map((desc, i) => `character ${i + 1}: ${desc}`)
      .join('; ');

    return {
      characterPrompt,
      referenceImage,
      characterCount: characters.length,
    };
  }

  private getDimensionsByAspectRatio(ratio: string) {
    switch (ratio) {
      case '16:9': return { width: 1024, height: 576 };
      case '1:1': return { width: 768, height: 768 };
      default: return { width: 576, height: 1024 };
    }
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
