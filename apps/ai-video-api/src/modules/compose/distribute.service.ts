import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  aspectRatio: string;
  maxWidth: number;
  maxHeight: number;
  maxDuration: number; // seconds
  subtitleStyle: {
    fontSize: number;
    position: 'bottom' | 'top' | 'center';
    margin: number;
  };
  metadata: {
    maxTitleLength: number;
    maxDescriptionLength: number;
    maxTags: number;
  };
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    aspectRatio: '9:16',
    maxWidth: 1080,
    maxHeight: 1920,
    maxDuration: 60,
    subtitleStyle: { fontSize: 28, position: 'bottom', margin: 100 },
    metadata: { maxTitleLength: 30, maxDescriptionLength: 500, maxTags: 5 },
  },
  {
    id: 'kuaishou',
    name: '快手',
    icon: '🎬',
    aspectRatio: '9:16',
    maxWidth: 1080,
    maxHeight: 1920,
    maxDuration: 60,
    subtitleStyle: { fontSize: 28, position: 'bottom', margin: 100 },
    metadata: { maxTitleLength: 30, maxDescriptionLength: 500, maxTags: 5 },
  },
  {
    id: 'weishi',
    name: '视频号',
    icon: '📱',
    aspectRatio: '9:16',
    maxWidth: 1080,
    maxHeight: 1920,
    maxDuration: 60,
    subtitleStyle: { fontSize: 28, position: 'bottom', margin: 100 },
    metadata: { maxTitleLength: 30, maxDescriptionLength: 500, maxTags: 3 },
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '📕',
    aspectRatio: '3:4',
    maxWidth: 1080,
    maxHeight: 1440,
    maxDuration: 60,
    subtitleStyle: { fontSize: 24, position: 'bottom', margin: 80 },
    metadata: { maxTitleLength: 20, maxDescriptionLength: 1000, maxTags: 10 },
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    icon: '▶️',
    aspectRatio: '9:16',
    maxWidth: 1080,
    maxHeight: 1920,
    maxDuration: 60,
    subtitleStyle: { fontSize: 28, position: 'bottom', margin: 100 },
    metadata: { maxTitleLength: 100, maxDescriptionLength: 5000, maxTags: 15 },
  },
  {
    id: 'bilibili',
    name: 'B站',
    icon: '📺',
    aspectRatio: '16:9',
    maxWidth: 1920,
    maxHeight: 1080,
    maxDuration: 300,
    subtitleStyle: { fontSize: 32, position: 'bottom', margin: 60 },
    metadata: { maxTitleLength: 80, maxDescriptionLength: 2000, maxTags: 12 },
  },
];

export interface DistributeConfig {
  platformId: string;
  title: string;
  description?: string;
  tags?: string[];
  coverUrl?: string;
}

@Injectable()
export class DistributeService {
  private readonly logger = new Logger(DistributeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取支持的平台列表
   */
  getPlatforms() {
    return { data: PLATFORMS };
  }

  /**
   * 获取单个平台配置
   */
  getPlatform(platformId: string) {
    const platform = PLATFORMS.find((p) => p.id === platformId);
    if (!platform) throw new NotFoundException('平台不存在');
    return { data: platform };
  }

  /**
   * 为项目生成分发配置建议
   */
  async generateDistributeConfig(userId: string, projectId: string, platformId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    const platform = PLATFORMS.find((p) => p.id === platformId);
    if (!platform) throw new NotFoundException('平台不存在');

    // Generate suggested title, description, tags
    const shots = await this.prisma.shot.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
    });

    const totalDuration = shots.reduce((sum, shot) => sum + (shot.duration || 3000), 0) / 1000;

    const suggestedTitle = project.name.length <= platform.metadata.maxTitleLength
      ? project.name
      : project.name.substring(0, platform.metadata.maxTitleLength - 3) + '...';

    const suggestedDescription = this.generateDescription(project, shots, platform);
    const suggestedTags = this.generateTags(project, platform);

    return {
      data: {
        platform,
        suggestedTitle,
        suggestedDescription,
        suggestedTags,
        videoDuration: Math.round(totalDuration),
        needsTrim: totalDuration > platform.maxDuration,
      },
    };
  }

  /**
   * 验证分发配置
   */
  validateDistributeConfig(config: DistributeConfig): { valid: boolean; errors: string[] } {
    const platform = PLATFORMS.find((p) => p.id === config.platformId);
    if (!platform) return { valid: false, errors: ['平台不存在'] };

    const errors: string[] = [];

    if (!config.title || config.title.trim().length === 0) {
      errors.push('标题不能为空');
    } else if (config.title.length > platform.metadata.maxTitleLength) {
      errors.push(`标题不能超过 ${platform.metadata.maxTitleLength} 个字符`);
    }

    if (config.description && config.description.length > platform.metadata.maxDescriptionLength) {
      errors.push(`描述不能超过 ${platform.metadata.maxDescriptionLength} 个字符`);
    }

    if (config.tags && config.tags.length > platform.metadata.maxTags) {
      errors.push(`标签不能超过 ${platform.metadata.maxTags} 个`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 批量导出分发包
   */
  async exportDistributePackages(
    userId: string,
    projectId: string,
    configs: DistributeConfig[],
  ) {
    await this.verifyProjectAccess(userId, projectId);

    const results: Array<{
      platformId: string;
      platformName: string;
      config: DistributeConfig;
      validation: { valid: boolean; errors: string[] };
    }> = [];

    for (const config of configs) {
      const platform = PLATFORMS.find((p) => p.id === config.platformId);
      const validation = this.validateDistributeConfig(config);

      results.push({
        platformId: config.platformId,
        platformName: platform?.name || config.platformId,
        config,
        validation,
      });
    }

    const allValid = results.every((r) => r.validation.valid);

    return {
      data: {
        projectId,
        totalPlatforms: results.length,
        validPlatforms: results.filter((r) => r.validation.valid).length,
        allValid,
        results,
      },
    };
  }

  private generateDescription(project: any, shots: any[], platform: PlatformConfig): string {
    const parts: string[] = [];

    if (project.description) {
      parts.push(project.description);
    }

    if (shots.length > 0) {
      const totalDuration = shots.reduce((sum, shot) => sum + (shot.duration || 3000), 0) / 1000;
      parts.push(`共 ${shots.length} 个分镜，时长 ${Math.round(totalDuration)} 秒`);
    }

    let description = parts.join('\n\n');
    if (description.length > platform.metadata.maxDescriptionLength) {
      description = description.substring(0, platform.metadata.maxDescriptionLength - 3) + '...';
    }

    return description;
  }

  private generateTags(project: any, platform: PlatformConfig): string[] {
    const tags: string[] = ['AI漫剧', '短视频'];

    if (project.style) {
      tags.push(project.style);
    }

    // Add more generic tags
    tags.push('创意', '故事');

    return tags.slice(0, platform.metadata.maxTags);
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
