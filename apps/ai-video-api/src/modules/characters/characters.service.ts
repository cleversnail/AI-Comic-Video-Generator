import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(CharactersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listByProject(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const characters = await this.prisma.character.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    return { data: characters };
  }

  async create(userId: string, projectId: string, dto: CreateCharacterDto) {
    await this.verifyProjectAccess(userId, projectId);
    const character = await this.prisma.character.create({
      data: {
        projectId,
        name: dto.name,
        gender: dto.gender,
        age: dto.age,
        role: dto.role,
        personality: dto.personality,
        appearance: dto.appearance,
      },
    });
    return { data: character };
  }

  async delete(userId: string, projectId: string, characterId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, projectId },
    });
    if (!character) throw new NotFoundException('角色不存在');
    await this.prisma.character.delete({ where: { id: characterId } });
    return { success: true };
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
