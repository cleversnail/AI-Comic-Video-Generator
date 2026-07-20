import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../common/user.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async listProjects(userId: string) {
    await this.userService.ensureUserExists(userId);
    const projects = await this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { shots: true, characters: true } },
      },
    });

    return {
      data: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        style: p.style,
        aspectRatio: p.aspectRatio,
        status: p.status,
        shotCount: p._count.shots,
        characterCount: p._count.characters,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };
  }

  async getProject(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        characters: true,
        storyboard: { orderBy: { sequence: 'asc' } },
        shots: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return { data: project };
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    await this.userService.ensureUserExists(userId);

    const project = await this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        style: dto.style,
        aspectRatio: dto.aspectRatio || '9:16',
      },
    });

    return { data: project };
  }

  async updateProject(userId: string, id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.style !== undefined && { style: dto.style }),
        ...(dto.aspectRatio !== undefined && { aspectRatio: dto.aspectRatio }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
    return { data: updated };
  }

  async deleteProject(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }
}
