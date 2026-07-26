import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建项目快照版本
   */
  async createSnapshot(userId: string, projectId: string, label?: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    // Get current project state
    const characters = await this.prisma.character.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    const storyboards = await this.prisma.storyboard.findMany({
      where: { projectId },
      include: { shots: { orderBy: { sequence: 'asc' } } },
    });

    // Get next version number
    const lastVersion = await this.prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastVersion?.version || 0) + 1;

    // Create snapshot
    const snapshot = {
      project: {
        name: project.name,
        description: project.description,
        style: project.style,
        aspectRatio: project.aspectRatio,
        status: project.status,
      },
      characters: characters.map((c) => ({
        id: c.id,
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
      storyboards: storyboards.map((sb) => ({
        id: sb.id,
        sequence: sb.sequence,
        description: sb.description,
        scene: sb.scene,
        emotion: sb.emotion,
        duration: sb.duration,
        shots: sb.shots.map((shot) => ({
          id: shot.id,
          sequence: shot.sequence,
          prompt: shot.prompt,
          negativePrompt: shot.negativePrompt,
          params: shot.params,
          status: shot.status,
          resultUrl: shot.resultUrl,
          firstFrameUrl: shot.firstFrameUrl,
          lastFrameUrl: shot.lastFrameUrl,
          duration: shot.duration,
        })),
      })),
    };

    const version = await this.prisma.projectVersion.create({
      data: {
        projectId,
        version: nextVersion,
        label: label || `v${nextVersion}`,
        snapshot,
      },
    });

    this.logger.log(`Snapshot created: project=${projectId}, version=${nextVersion}`);

    return {
      data: {
        id: version.id,
        version: version.version,
        label: version.label,
        createdAt: version.createdAt,
      },
    };
  }

  /**
   * 获取版本历史列表
   */
  async listVersions(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    const versions = await this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        label: true,
        createdAt: true,
      },
    });

    return { data: versions };
  }

  /**
   * 获取版本详情（含快照）
   */
  async getVersion(userId: string, projectId: string, versionId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) throw new NotFoundException('版本不存在');

    return { data: version };
  }

  /**
   * 恢复到指定版本
   */
  async restoreVersion(userId: string, projectId: string, versionId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) throw new NotFoundException('版本不存在');

    const snapshot = version.snapshot as any;

    // Create a snapshot of current state before restoring
    await this.createSnapshot(userId, projectId, `恢复前自动快照`);

    // Restore project info
    if (snapshot.project) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          name: snapshot.project.name,
          description: snapshot.project.description,
          style: snapshot.project.style,
          aspectRatio: snapshot.project.aspectRatio,
          status: snapshot.project.status,
        },
      });
    }

    // Delete current characters and restore from snapshot
    await this.prisma.character.deleteMany({ where: { projectId } });
    if (snapshot.characters) {
      for (const char of snapshot.characters) {
        await this.prisma.character.create({
          data: {
            projectId,
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
    }

    // Delete current storyboards and shots, restore from snapshot
    await this.prisma.shot.deleteMany({ where: { projectId } });
    await this.prisma.storyboard.deleteMany({ where: { projectId } });
    if (snapshot.storyboards) {
      for (const sb of snapshot.storyboards) {
        const newStoryboard = await this.prisma.storyboard.create({
          data: {
            projectId,
            sequence: sb.sequence,
            description: sb.description,
            scene: sb.scene,
            emotion: sb.emotion,
            duration: sb.duration,
          },
        });

        if (sb.shots) {
          for (const shot of sb.shots) {
            await this.prisma.shot.create({
              data: {
                projectId,
                storyboardId: newStoryboard.id,
                sequence: shot.sequence,
                prompt: shot.prompt,
                negativePrompt: shot.negativePrompt,
                params: shot.params,
                status: shot.status,
                resultUrl: shot.resultUrl,
                firstFrameUrl: shot.firstFrameUrl,
                lastFrameUrl: shot.lastFrameUrl,
                duration: shot.duration,
              },
            });
          }
        }
      }
    }

    this.logger.log(`Version restored: project=${projectId}, version=${version.version}`);

    return {
      data: {
        restoredVersion: version.version,
        label: version.label,
      },
    };
  }

  /**
   * 删除版本
   */
  async deleteVersion(userId: string, projectId: string, versionId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) throw new NotFoundException('版本不存在');

    await this.prisma.projectVersion.delete({ where: { id: versionId } });
    return { success: true };
  }
}
