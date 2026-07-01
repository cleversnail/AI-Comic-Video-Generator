import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
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

  @Post()
  @ApiOperation({ summary: '创建角色' })
  async create(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Body() dto: CreateCharacterDto) {
    return this.charactersService.create(userId, projectId, dto);
  }

  @Delete(':characterId')
  @ApiOperation({ summary: '删除角色' })
  async delete(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('characterId') characterId: string) {
    return this.charactersService.delete(userId, projectId, characterId);
  }
}
