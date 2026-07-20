import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { ModelsService } from '../models/models.service';

@Injectable()
export class KeyframeService {
  private readonly logger = new Logger(KeyframeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactory,
    private readonly modelsService: ModelsService,
  ) {}

  /**
   * 为单个分镜生成首帧和尾帧
   */
  async generateKeyframes(userId: string, projectId: string, shotId: string) {
    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });
    if (!shot) throw new NotFoundException('分镜不存在');

    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'image');

    // Get character context for consistent generation
    const characters = await this.prisma.character.findMany({
      where: { projectId },
    });

    const params = shot.params as any;
    const basePrompt = shot.prompt || params?.description || '';
    const characterDesc = characters
      .map((c) => `${c.name}: ${c.appearance || ''} ${c.outfit || ''}`.trim())
      .join('; ');

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const dimensions = this.getDimensionsByAspectRatio(project?.aspectRatio || '9:16');

    const imageAdapter = this.adapterFactory.getImageAdapter(modelId);

    // Generate first frame
    const firstFramePrompt = `${basePrompt}, beginning of scene${characterDesc ? ', characters: ' + characterDesc : ''}, cinematic lighting, high quality`;
    this.logger.log(`Generating first frame for shot ${shotId}`);

    const firstResult = await imageAdapter.generateImage(
      { prompt: firstFramePrompt, width: dimensions.width, height: dimensions.height },
      { apiKey, baseUrl }
    );

    // Generate last frame (scene ending)
    const lastFramePrompt = `${basePrompt}, end of scene, conclusion${characterDesc ? ', characters: ' + characterDesc : ''}, cinematic lighting, high quality`;
    this.logger.log(`Generating last frame for shot ${shotId}`);

    const lastResult = await imageAdapter.generateImage(
      { prompt: lastFramePrompt, width: dimensions.width, height: dimensions.height },
      { apiKey, baseUrl }
    );

    // Update shot with keyframe URLs
    const updated = await this.prisma.shot.update({
      where: { id: shotId },
      data: {
        firstFrameUrl: firstResult.url,
        lastFrameUrl: lastResult.url,
      },
    });

    return {
      data: {
        shotId,
        firstFrameUrl: firstResult.url,
        lastFrameUrl: lastResult.url,
      },
    };
  }

  /**
   * 批量为项目所有分镜生成首尾帧
   */
  async generateAllKeyframes(userId: string, projectId: string) {
    const shots = await this.prisma.shot.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
    });

    if (shots.length === 0) throw new NotFoundException('项目没有分镜');

    const results = [];
    for (const shot of shots) {
      try {
        const result = await this.generateKeyframes(userId, projectId, shot.id);
        results.push(result.data);
      } catch (error: any) {
        this.logger.error(`Failed to generate keyframes for shot ${shot.id}: ${error.message}`);
        results.push({ shotId: shot.id, error: error.message });
      }
    }

    return { data: results };
  }

  /**
   * 手动上传首帧或尾帧
   */
  async uploadKeyframe(userId: string, projectId: string, shotId: string, frameType: 'first' | 'last', imageUrl: string) {
    await this.verifyShotAccess(userId, projectId, shotId);

    const field = frameType === 'first' ? 'firstFrameUrl' : 'lastFrameUrl';
    const updated = await this.prisma.shot.update({
      where: { id: shotId },
      data: { [field]: imageUrl },
    });

    return { data: { shotId, [field]: imageUrl } };
  }

  private async verifyShotAccess(userId: string, projectId: string, shotId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('项目不存在');
    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });
    if (!shot) throw new NotFoundException('分镜不存在');
    return { project, shot };
  }

  private getDimensionsByAspectRatio(ratio: string): { width: number; height: number } {
    switch (ratio) {
      case '16:9': return { width: 1024, height: 576 };
      case '1:1': return { width: 768, height: 768 };
      case '9:16': default: return { width: 576, height: 1024 };
    }
  }
}
