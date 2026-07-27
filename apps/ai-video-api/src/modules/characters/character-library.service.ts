import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateLibraryCharacterDto {
  name: string;
  gender?: string;
  age?: number;
  role?: string;
  personality?: string;
  appearance?: string;
  outfit?: string;
  prompt?: string;
  mainImage?: string;
  viewImages?: any;
  variants?: any;
  lockLevel?: string;
  tags?: string[];
}

@Injectable()
export class CharacterLibraryService {
  private readonly logger = new Logger(CharacterLibraryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户的角色库列表
   */
  async listLibraryCharacters(userId: string, tag?: string) {
    const where: any = { userId };
    if (tag) {
      where.tags = { contains: tag };
    }

    const characters = await this.prisma.characterLibrary.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return { data: characters };
  }

  /**
   * 获取角色库详情
   */
  async getLibraryCharacter(userId: string, characterId: string) {
    const character = await this.prisma.characterLibrary.findFirst({
      where: { id: characterId, userId },
    });
    if (!character) throw new NotFoundException('角色库角色不存在');

    return { data: character };
  }

  /**
   * 创建角色库角色
   */
  async createLibraryCharacter(userId: string, dto: CreateLibraryCharacterDto) {
    const character = await this.prisma.characterLibrary.create({
      data: {
        userId,
        name: dto.name,
        gender: dto.gender,
        age: dto.age,
        role: dto.role,
        personality: dto.personality,
        appearance: dto.appearance,
        outfit: dto.outfit,
        prompt: dto.prompt,
        mainImage: dto.mainImage,
        viewImages: dto.viewImages,
        variants: dto.variants,
        lockLevel: dto.lockLevel || 'medium',
        tags: dto.tags || [],
      },
    });

    this.logger.log(`Library character created: ${character.name} by user ${userId}`);
    return { data: character };
  }

  /**
   * 更新角色库角色
   */
  async updateLibraryCharacter(userId: string, characterId: string, dto: Partial<CreateLibraryCharacterDto>) {
    const character = await this.prisma.characterLibrary.findFirst({
      where: { id: characterId, userId },
    });
    if (!character) throw new NotFoundException('角色库角色不存在');

    const updated = await this.prisma.characterLibrary.update({
      where: { id: characterId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.age !== undefined && { age: dto.age }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.personality !== undefined && { personality: dto.personality }),
        ...(dto.appearance !== undefined && { appearance: dto.appearance }),
        ...(dto.outfit !== undefined && { outfit: dto.outfit }),
        ...(dto.prompt !== undefined && { prompt: dto.prompt }),
        ...(dto.mainImage !== undefined && { mainImage: dto.mainImage }),
        ...(dto.viewImages !== undefined && { viewImages: dto.viewImages }),
        ...(dto.variants !== undefined && { variants: dto.variants }),
        ...(dto.lockLevel !== undefined && { lockLevel: dto.lockLevel }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });

    return { data: updated };
  }

  /**
   * 删除角色库角色
   */
  async deleteLibraryCharacter(userId: string, characterId: string) {
    const character = await this.prisma.characterLibrary.findFirst({
      where: { id: characterId, userId },
    });
    if (!character) throw new NotFoundException('角色库角色不存在');

    // Unlink all project characters that reference this library character
    await this.prisma.character.updateMany({
      where: { libraryCharacterId: characterId },
      data: { libraryCharacterId: null },
    });

    await this.prisma.characterLibrary.delete({ where: { id: characterId } });
    return { success: true };
  }

  /**
   * 从角色库导入角色到项目
   */
  async importToProject(userId: string, projectId: string, libraryCharacterId: string) {
    // Verify project access
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    // Get library character
    const libraryChar = await this.prisma.characterLibrary.findFirst({
      where: { id: libraryCharacterId, userId },
    });
    if (!libraryChar) throw new NotFoundException('角色库角色不存在');

    // Create project character with reference to library character
    const character = await this.prisma.character.create({
      data: {
        projectId,
        name: libraryChar.name,
        gender: libraryChar.gender,
        age: libraryChar.age,
        role: libraryChar.role,
        personality: libraryChar.personality,
        appearance: libraryChar.appearance,
        outfit: libraryChar.outfit,
        prompt: libraryChar.prompt,
        mainImage: libraryChar.mainImage,
        viewImages: libraryChar.viewImages ?? undefined,
        variants: libraryChar.variants ?? undefined,
        lockLevel: libraryChar.lockLevel,
        libraryCharacterId: libraryCharacterId,
      },
    });

    this.logger.log(`Library character imported: ${libraryChar.name} to project ${projectId}`);
    return { data: character };
  }

  /**
   * 将项目角色保存到角色库
   */
  async saveToLibrary(userId: string, characterId: string, tags?: string[]) {
    const character = await this.prisma.character.findFirst({
      where: { id: characterId },
      include: { project: true },
    });
    if (!character) throw new NotFoundException('角色不存在');
    if (character.project.userId !== userId) throw new NotFoundException('角色不存在');

    // Check if already in library
    if (character.libraryCharacterId) {
      // Update existing library character
      const updated = await this.prisma.characterLibrary.update({
        where: { id: character.libraryCharacterId },
        data: {
          name: character.name,
          gender: character.gender,
          age: character.age,
          role: character.role,
          personality: character.personality,
          appearance: character.appearance,
          outfit: character.outfit,
          prompt: character.prompt,
          mainImage: character.mainImage,
          viewImages: character.viewImages ?? undefined,
          variants: character.variants ?? undefined,
          lockLevel: character.lockLevel,
          ...(tags && { tags }),
        },
      });
      return { data: updated };
    }

    // Create new library character
    const libraryChar = await this.prisma.characterLibrary.create({
      data: {
        userId,
        name: character.name,
        gender: character.gender,
        age: character.age,
        role: character.role,
        personality: character.personality,
        appearance: character.appearance,
        outfit: character.outfit,
        prompt: character.prompt,
        mainImage: character.mainImage,
        viewImages: character.viewImages ?? undefined,
        variants: character.variants ?? undefined,
        lockLevel: character.lockLevel,
        tags: tags || [],
      },
    });

    // Link project character to library character
    await this.prisma.character.update({
      where: { id: characterId },
      data: { libraryCharacterId: libraryChar.id },
    });

    this.logger.log(`Project character saved to library: ${character.name}`);
    return { data: libraryChar };
  }

  /**
   * 获取角色的所有引用（哪些项目在使用）
   */
  async getCharacterReferences(userId: string, libraryCharacterId: string) {
    const libraryChar = await this.prisma.characterLibrary.findFirst({
      where: { id: libraryCharacterId, userId },
    });
    if (!libraryChar) throw new NotFoundException('角色库角色不存在');

    const references = await this.prisma.character.findMany({
      where: { libraryCharacterId },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      data: {
        libraryCharacter: libraryChar,
        references: references.map((ref) => ({
          id: ref.id,
          projectId: ref.projectId,
          projectName: ref.project.name,
          name: ref.name,
        })),
      },
    };
  }
}
