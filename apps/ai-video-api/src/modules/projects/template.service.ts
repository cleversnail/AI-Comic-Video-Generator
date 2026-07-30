import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  coverUrl?: string;
  isPublic?: boolean;
}

export interface TemplateSnapshot {
  project: {
    name: string;
    description?: string;
    style?: string;
    aspectRatio: string;
  };
  characters: any[];
  episodes: any[];
  storyboards: any[];
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取模板列表（公开 + 用户自己的）
   */
  async listTemplates(userId: string, category?: string, search?: string) {
    const where: any = {
      OR: [
        { isPublic: true },
        { userId },
      ],
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const templates = await this.prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { favorites: true, projects: true },
        },
      },
    });

    return {
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        coverUrl: t.coverUrl,
        isPublic: t.isPublic,
        favoriteCount: t._count.favorites,
        usageCount: t._count.projects,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * 获取模板详情
   */
  async getTemplate(userId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [
          { isPublic: true },
          { userId },
        ],
      },
      include: {
        _count: {
          select: { favorites: true, projects: true },
        },
      },
    });

    if (!template) throw new NotFoundException('模板不存在');

    return { data: template };
  }

  /**
   * 将项目保存为模板
   */
  async saveAsTemplate(userId: string, projectId: string, dto: CreateTemplateDto) {
    // Verify project access
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    // Get project data for snapshot
    const characters = await this.prisma.character.findMany({
      where: { projectId },
    });

    const episodes = await this.prisma.episode.findMany({
      where: { projectId },
      orderBy: { number: 'asc' },
    });

    const storyboards = await this.prisma.storyboard.findMany({
      where: { projectId },
      include: { shots: { orderBy: { sequence: 'asc' } } },
      orderBy: { sequence: 'asc' },
    });

    const snapshot: TemplateSnapshot = {
      project: {
        name: project.name,
        description: project.description || undefined,
        style: project.style || undefined,
        aspectRatio: project.aspectRatio,
      },
      characters: characters.map((c) => ({
        name: c.name,
        gender: c.gender,
        age: c.age,
        role: c.role,
        personality: c.personality,
        appearance: c.appearance,
        outfit: c.outfit,
        mainImage: c.mainImage,
        viewImages: c.viewImages,
        variants: c.variants,
        lockLevel: c.lockLevel,
      })),
      episodes: episodes.map((ep) => ({
        number: ep.number,
        title: ep.title,
        description: ep.description,
      })),
      storyboards: storyboards.map((sb) => ({
        sequence: sb.sequence,
        description: sb.description,
        scene: sb.scene,
        emotion: sb.emotion,
        duration: sb.duration,
        episodeNumber: episodes.find((ep) => ep.id === sb.episodeId)?.number,
        shots: sb.shots.map((shot) => ({
          sequence: shot.sequence,
          prompt: shot.prompt,
          negativePrompt: shot.negativePrompt,
          params: shot.params,
          duration: shot.duration,
        })),
      })),
    };

    const template = await this.prisma.template.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        category: dto.category || 'general',
        tags: dto.tags || [],
        coverUrl: dto.coverUrl,
        isPublic: dto.isPublic ?? true,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
      },
    });

    this.logger.log(`Template created: ${template.name} from project ${projectId}`);
    return { data: template };
  }

  /**
   * 从模板复刻为新项目
   */
  async cloneFromTemplate(userId: string, templateId: string, projectName?: string) {
    const template = await this.prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [
          { isPublic: true },
          { userId },
        ],
      },
    });

    if (!template) throw new NotFoundException('模板不存在');

    const snapshot = template.snapshot as unknown as TemplateSnapshot;

    // Create new project
    const project = await this.prisma.project.create({
      data: {
        userId,
        name: projectName || `${snapshot.project.name} (副本)`,
        description: snapshot.project.description,
        style: snapshot.project.style,
        aspectRatio: snapshot.project.aspectRatio,
      },
    });

    // Create characters
    for (const char of snapshot.characters) {
      await this.prisma.character.create({
        data: {
          projectId: project.id,
          name: char.name,
          gender: char.gender,
          age: char.age,
          role: char.role,
          personality: char.personality,
          appearance: char.appearance,
          outfit: char.outfit,
          mainImage: char.mainImage,
          viewImages: char.viewImages,
          variants: char.variants,
          lockLevel: char.lockLevel,
        },
      });
    }

    // Create episodes
    const episodeMap = new Map<number, string>();
    for (const ep of snapshot.episodes) {
      const created = await this.prisma.episode.create({
        data: {
          projectId: project.id,
          number: ep.number,
          title: ep.title,
          description: ep.description,
        },
      });
      episodeMap.set(ep.number, created.id);
    }

    // Create storyboards and shots
    for (const sb of snapshot.storyboards) {
      const storyboard = await this.prisma.storyboard.create({
        data: {
          projectId: project.id,
          sequence: sb.sequence,
          description: sb.description,
          scene: sb.scene,
          emotion: sb.emotion,
          duration: sb.duration,
          episodeId: sb.episodeNumber ? episodeMap.get(sb.episodeNumber) : null,
        },
      });

      for (const shot of sb.shots) {
        await this.prisma.shot.create({
          data: {
            projectId: project.id,
            storyboardId: storyboard.id,
            sequence: shot.sequence,
            prompt: shot.prompt,
            negativePrompt: shot.negativePrompt,
            params: shot.params,
            duration: shot.duration,
          },
        });
      }
    }

    // Increment usage count
    await this.prisma.template.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    this.logger.log(`Project cloned from template: ${template.name} -> ${project.name}`);
    return { data: project };
  }

  /**
   * 收藏/取消收藏模板
   */
  async toggleFavorite(userId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('模板不存在');

    const existing = await this.prisma.templateFavorite.findFirst({
      where: { userId, templateId },
    });

    if (existing) {
      await this.prisma.templateFavorite.delete({
        where: { id: existing.id },
      });
      return { data: { favorited: false } };
    } else {
      await this.prisma.templateFavorite.create({
        data: { userId, templateId },
      });
      return { data: { favorited: true } };
    }
  }

  /**
   * 获取用户收藏的模板
   */
  async getFavorites(userId: string) {
    const favorites = await this.prisma.templateFavorite.findMany({
      where: { userId },
      include: {
        template: {
          include: {
            _count: {
              select: { favorites: true, projects: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: favorites.map((f) => ({
        id: f.template.id,
        name: f.template.name,
        description: f.template.description,
        category: f.template.category,
        tags: f.template.tags,
        coverUrl: f.template.coverUrl,
        favoriteCount: f.template._count.favorites,
        usageCount: f.template._count.projects,
        favoritedAt: f.createdAt,
      })),
    };
  }

  /**
   * 更新模板
   */
  async updateTemplate(userId: string, templateId: string, dto: Partial<CreateTemplateDto>) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, userId },
    });
    if (!template) throw new NotFoundException('模板不存在或无权编辑');

    const updated = await this.prisma.template.update({
      where: { id: templateId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
    });

    return { data: updated };
  }

  /**
   * 删除模板
   */
  async deleteTemplate(userId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, userId },
    });
    if (!template) throw new NotFoundException('模板不存在或无权删除');

    // Delete favorites first
    await this.prisma.templateFavorite.deleteMany({
      where: { templateId },
    });

    await this.prisma.template.delete({ where: { id: templateId } });
    return { success: true };
  }
}
