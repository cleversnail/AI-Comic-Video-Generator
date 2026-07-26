import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';

@Injectable()
export class StoryboardTtsService {
  private readonly logger = new Logger(StoryboardTtsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  /**
   * 为分镜生成 TTS 音频
   */
  async generateTtsForShot(userId: string, projectId: string, shotId: string, voiceId?: string, speed?: number) {
    await this.verifyProjectAccess(userId, projectId);

    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });
    if (!shot) throw new NotFoundException('Shot not found');

    const params = shot.params as any;
    const text = params?.dialogue || params?.narration || params?.subtitle || '';
    if (!text) {
      throw new BadRequestException('该分镜没有台词、旁白或字幕，无法生成配音');
    }

    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'tts');

    try {
      const ttsAdapter = this.adapterFactory.getTTSAdapter(modelId);
      const result = await ttsAdapter.generateSpeech(
        {
          text,
          voiceId: voiceId || 'male-qn-qingse',
          speed: speed || 1.0,
          language: 'zh',
        },
        { apiKey, baseUrl }
      );

      const updatedParams = { ...params, audioUrl: result.audioUrl };
      const updatedDuration = result.duration ? Math.ceil(result.duration * 1000) : shot.duration;

      await this.prisma.shot.update({
        where: { id: shotId },
        data: { params: updatedParams, duration: updatedDuration },
      });

      return { data: { shotId, audioUrl: result.audioUrl, duration: updatedDuration } };
    } catch (error: any) {
      this.logger.error(`TTS generation failed for shot ${shotId}: ${error.message}`);
      throw new BadRequestException(`配音生成失败: ${error.message}`);
    }
  }

  /**
   * 批量为分镜生成 TTS 音频
   */
  async generateTtsForShots(userId: string, projectId: string, shotIds?: string[], voiceId?: string, speed?: number) {
    await this.verifyProjectAccess(userId, projectId);

    const shots = await this.prisma.shot.findMany({
      where: shotIds?.length ? { projectId, id: { in: shotIds } } : { projectId },
      orderBy: { sequence: 'asc' },
    });

    if (shots.length === 0) throw new BadRequestException('没有找到需要生成配音的分镜');

    const shotsWithText = shots.filter((shot) => {
      const params = shot.params as any;
      return params?.dialogue || params?.narration || params?.subtitle;
    });

    if (shotsWithText.length === 0) {
      throw new BadRequestException('选中的分镜中没有台词、旁白或字幕');
    }

    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'tts');
    const ttsAdapter = this.adapterFactory.getTTSAdapter(modelId);

    const results: Array<{ shotId: string; audioUrl: string; duration: number; status: string }> = [];
    const errors: Array<{ shotId: string; error: string }> = [];

    for (const shot of shotsWithText) {
      const params = shot.params as any;
      const text = params?.dialogue || params?.narration || params?.subtitle;

      try {
        const result = await ttsAdapter.generateSpeech(
          { text, voiceId: voiceId || 'male-qn-qingse', speed: speed || 1.0, language: 'zh' },
          { apiKey, baseUrl }
        );

        const updatedParams = { ...params, audioUrl: result.audioUrl };
        const updatedDuration = result.duration ? Math.ceil(result.duration * 1000) : shot.duration;

        await this.prisma.shot.update({
          where: { id: shot.id },
          data: { params: updatedParams, duration: updatedDuration },
        });

        results.push({ shotId: shot.id, audioUrl: result.audioUrl, duration: updatedDuration, status: 'success' });
      } catch (error: any) {
        this.logger.error(`TTS failed for shot ${shot.id}: ${error.message}`);
        errors.push({ shotId: shot.id, error: error.message });
        results.push({ shotId: shot.id, audioUrl: '', duration: shot.duration, status: 'failed' });
      }
    }

    return {
      data: {
        total: shotsWithText.length,
        success: results.filter((r) => r.status === 'success').length,
        failed: errors.length,
        results,
      },
    };
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
