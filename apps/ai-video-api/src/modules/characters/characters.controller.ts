import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('角色')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  @ApiOperation({ summary: '获取项目角色列表' })
  async list(@CurrentUser('id') userId: string, @Param('projectId') projectId: string) {
    return this.charactersService.listByProject(userId, projectId);
  }

  @Get('variant-types')
  @ApiOperation({ summary: '获取变体类型列表' })
  async getVariantTypes() {
    return this.charactersService.getVariantTypes();
  }

  @Get(':characterId')
  @ApiOperation({ summary: '获取角色详情' })
  async getOne(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string) {
    return this.charactersService.getOne(userId, projectId, characterId);
  }

  @Post()
  @ApiOperation({ summary: '创建角色' })
  async create(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Body() dto: CreateCharacterDto) {
    return this.charactersService.create(userId, projectId, dto);
  }

  @Put(':characterId')
  @ApiOperation({ summary: '更新角色' })
  async update(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string, @Body() dto: UpdateCharacterDto) {
    return this.charactersService.update(userId, projectId, characterId, dto);
  }

  @Delete(':characterId')
  @ApiOperation({ summary: '删除角色' })
  async delete(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string) {
    return this.charactersService.delete(userId, projectId, characterId);
  }

  @Post(':characterId/generate-views')
  @ApiOperation({ summary: '生成角色四视图' })
  async generateViews(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string) {
    return this.charactersService.generateViewImages(userId, projectId, characterId);
  }

  @Delete(':characterId/views')
  @ApiOperation({ summary: '清除角色四视图' })
  async clearViews(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string) {
    return this.charactersService.clearViewImages(userId, projectId, characterId);
  }

  @Post(':characterId/variants/:variantType')
  @ApiOperation({ summary: '生成角色变体' })
  async generateVariant(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string, @Param('variantType') variantType: string) {
    return this.charactersService.generateVariants(userId, projectId, characterId, variantType);
  }

  @Delete(':characterId/variants/:variantId')
  @ApiOperation({ summary: '删除角色变体' })
  async deleteVariant(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string, @Param('variantId') variantId: string) {
    return this.charactersService.deleteVariant(userId, projectId, characterId, variantId);
  }
}
