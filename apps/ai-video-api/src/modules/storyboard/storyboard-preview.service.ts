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
    const prompt = dto.customPrompt || shot.prompt || params?.description || '';
    if (!prompt) throw new BadRequestException('该分镜没有提示词，无法生成预览');

    // 获取角色信息和参考图
    const { characterPrompt, referenceImage } = await this.buildCharacterDataForShot(projectId, params?.characterIds || []);
    const finalPrompt = characterPrompt ? `${characterPrompt}, ${prompt}` : prompt;

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const dimensions = this.getDimensionsByAspectRatio(project?.aspectRatio || '9:16');

    this.logger.log(`Generating preview for shot ${shotId} using ${modelId}${referenceImage ? ' with reference image' : ''}`);

    let imageUrl: string;
    try {
      const imageAdapter = this.adapterFactory.getImageAdapter(modelId);
      const result = await imageAdapter.generateImage(
        {
          prompt: finalPrompt,
          negativePrompt: shot.negativePrompt || undefined,
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
  ): Promise<{ characterPrompt: string; referenceImage: string | null }> {
    if (!characterIds?.length) return { characterPrompt: '', referenceImage: null };

    const characters = await this.prisma.character.findMany({
      where: { projectId, id: { in: characterIds } },
    });

    if (characters.length === 0) return { characterPrompt: '', referenceImage: null };

    const prompts: string[] = [];
    let referenceImage: string | null = null;

    for (const character of characters) {
      const parts: string[] = [`same character as ${character.name}`];
      if (character.appearance) parts.push(character.appearance);
      if (character.outfit) parts.push(`wearing ${character.outfit}`);

      // 锁定强度
      const lockLevel = character.lockLevel || 'medium';
      if (lockLevel === 'strict') {
        parts.push('highly consistent appearance, identical character design, same face and outfit');
      } else if (lockLevel === 'medium') {
        parts.push('consistent character design, same face and outfit style');
      } else {
        parts.push('similar character style');
      }

      // 优先使用主图作为参考，其次使用四视图
      if (!referenceImage) {
        if (character.mainImage) {
          referenceImage = character.mainImage;
          parts.push('maintain exact same appearance as reference image');
        } else if (character.viewImages) {
          const viewImages = character.viewImages as any;
          const frontImage = viewImages?.front;
          if (frontImage) {
            referenceImage = frontImage;
            parts.push('maintain exact same appearance as reference image');
          }
        }
      }

      prompts.push(parts.join(', '));
    }

    return {
      characterPrompt: 'featuring ' + prompts.join('; and '),
      referenceImage,
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
