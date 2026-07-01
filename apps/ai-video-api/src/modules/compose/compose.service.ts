import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';

export interface ComposeInput {
  projectId: string;
  shots: Array<{
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    duration: number;
    subtitle?: string;
  }>;
  outputFormat?: 'mp4' | 'mov';
  resolution?: '1080p' | '720p';
}

@Injectable()
export class ComposeService {
  private readonly logger = new Logger(ComposeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async composeProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { shots: { orderBy: { sequence: 'asc' } } },
    });

    if (!project) throw new Error('项目不存在');

    // Build compose input from shots
    const shots = project.shots.map((shot) => ({
      imageUrl: shot.resultUrl || undefined,
      duration: shot.duration || 3000,
      subtitle: ((shot.params as any)?.title || '') as string,
    }));

    this.logger.log(`Composing project ${projectId} with ${shots.length} shots`);

    // In production, this would call FFmpeg
    // For now, return the compose plan
    return {
      data: {
        projectId,
        shots: shots.length,
        totalDuration: shots.reduce((sum, s) => sum + s.duration, 0),
        status: 'ready',
        message: '合成计划已就绪，等待 FFmpeg Worker 执行',
      },
    };
  }
}
