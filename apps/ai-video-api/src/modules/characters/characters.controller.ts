import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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

  @Post(':characterId/variants/:variantType')
  @ApiOperation({ summary: '生成角色变体' })
  async generateVariant(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string, @Param('variantType') variantType: string) {
    return this.charactersService.generateVariants(userId, projectId, characterId, variantType);
  }

  @Put(':characterId/lock-level')
  @ApiOperation({ summary: '更新角色锁定强度' })
  async updateLockLevel(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string, @Body() body: { lockLevel: string }) {
    return this.charactersService.updateLockLevel(userId, projectId, characterId, body.lockLevel);
  }

  @Get('lock-level-info')
  @ApiOperation({ summary: '获取锁定强度选项信息' })
  async getLockLevelInfo() {
    return {
      data: [
        { key: 'loose', ...this.charactersService.getLockLevelInfo('loose') },
        { key: 'medium', ...this.charactersService.getLockLevelInfo('medium') },
        { key: 'strict', ...this.charactersService.getLockLevelInfo('strict') },
      ],
    };
  }
}
