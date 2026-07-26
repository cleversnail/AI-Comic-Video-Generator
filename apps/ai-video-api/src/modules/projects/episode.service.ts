import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EpisodeService {
  private readonly logger = new Logger(EpisodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取项目的剧集列表
   */
  async listEpisodes(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const episodes = await this.prisma.episode.findMany({
      where: { projectId },
      orderBy: { number: 'asc' },
      include: {
        _count: {
          select: { storyboard: true },
        },
      },
    });

    return {
      data: episodes.map((ep) => ({
        id: ep.id,
        number: ep.number,
        title: ep.title,
        description: ep.description,
        status: ep.status,
        storyboardCount: ep._count.storyboard,
        createdAt: ep.createdAt,
        updatedAt: ep.updatedAt,
      })),
    };
  }

  /**
   * 创建新剧集
   */
  async createEpisode(userId: string, projectId: string, data: { title?: string; description?: string }) {
    await this.verifyProjectAccess(userId, projectId);

    // Get next episode number
    const lastEpisode = await this.prisma.episode.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
    });
    const nextNumber = (lastEpisode?.number || 0) + 1;

    const episode = await this.prisma.episode.create({
      data: {
        projectId,
        number: nextNumber,
        title: data.title || `第 ${nextNumber} 集`,
        description: data.description,
      },
    });

    this.logger.log(`Episode created: project=${projectId}, episode=${nextNumber}`);

    return { data: episode };
  }

  /**
   * 获取剧集详情
   */
  async getEpisode(userId: string, projectId: string, episodeId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const episode = await this.prisma.episode.findFirst({
      where: { id: episodeId, projectId },
      include: {
        storyboard: {
          include: {
            shots: { orderBy: { sequence: 'asc' } },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!episode) throw new NotFoundException('剧集不存在');

    return { data: episode };
  }

  /**
   * 更新剧集
   */
  async updateEpisode(userId: string, projectId: string, episodeId: string, data: { title?: string; description?: string; status?: string }) {
    await this.verifyProjectAccess(userId, projectId);

    const episode = await this.prisma.episode.findFirst({
      where: { id: episodeId, projectId },
    });
    if (!episode) throw new NotFoundException('剧集不存在');

    const updated = await this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return { data: updated };
  }

  /**
   * 删除剧集
   */
  async deleteEpisode(userId: string, projectId: string, episodeId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const episode = await this.prisma.episode.findFirst({
      where: { id: episodeId, projectId },
    });
    if (!episode) throw new NotFoundException('剧集不存在');

    // Delete associated storyboards and shots
    await this.prisma.shot.deleteMany({
      where: { storyboard: { episodeId } },
    });
    await this.prisma.storyboard.deleteMany({
      where: { episodeId },
    });
    await this.prisma.episode.delete({ where: { id: episodeId } });

    return { success: true };
  }

  /**
   * 将现有分镜分配到剧集
   */
  async assignStoryboardToEpisode(userId: string, projectId: string, storyboardId: string, episodeId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const storyboard = await this.prisma.storyboard.findFirst({
      where: { id: storyboardId, projectId },
    });
    if (!storyboard) throw new NotFoundException('分镜不存在');

    const episode = await this.prisma.episode.findFirst({
      where: { id: episodeId, projectId },
    });
    if (!episode) throw new NotFoundException('剧集不存在');

    await this.prisma.storyboard.update({
      where: { id: storyboardId },
      data: { episodeId },
    });

    return { success: true };
  }

  /**
   * 获取项目的角色列表（跨集共享）
   */
  async getSharedCharacters(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const characters = await this.prisma.character.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return { data: characters };
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
