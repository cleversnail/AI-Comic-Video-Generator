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

    const characterPrompt = await this.buildCharacterPromptForShot(projectId, params?.characterIds || []);
    const finalPrompt = characterPrompt ? `${characterPrompt}, ${prompt}` : prompt;

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const dimensions = this.getDimensionsByAspectRatio(project?.aspectRatio || '9:16');

    this.logger.log(`Generating preview for shot ${shotId} using ${modelId}`);

    let imageUrl: string;
    try {
      const imageAdapter = this.adapterFactory.getImageAdapter(modelId);
      const result = await imageAdapter.generateImage(
        { prompt: finalPrompt, width: dimensions.width, height: dimensions.height },
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

  private async buildCharacterPromptForShot(projectId: string, characterIds: string[]): Promise<string> {
    if (!characterIds?.length) return '';

    const characters = await this.prisma.character.findMany({
      where: { projectId, id: { in: characterIds } },
    });

    if (characters.length === 0) return '';

    const prompts: string[] = [];
    for (const character of characters) {
      const parts: string[] = [`same character as ${character.name}`];
      if (character.appearance) parts.push(character.appearance);
      if (character.outfit) parts.push(`wearing ${character.outfit}`);

      const lockLevel = character.lockLevel || 'medium';
      if (lockLevel === 'strict') {
        parts.push('highly consistent appearance, identical character design');
      } else if (lockLevel === 'medium') {
        parts.push('consistent character design, same face and outfit style');
      } else {
        parts.push('similar character style');
      }

      if (character.viewImages) {
        const viewCount = Object.values(character.viewImages).filter(Boolean).length;
        if (viewCount > 0) parts.push(`refer to ${viewCount}-view character sheet`);
      }

      prompts.push(parts.join(', '));
    }

    return 'featuring ' + prompts.join('; and ');
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
