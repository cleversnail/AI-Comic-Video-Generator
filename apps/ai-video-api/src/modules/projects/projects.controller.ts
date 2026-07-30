import { Controller, Get, Post, Put, Patch, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { VersionService } from './version.service';
import { EpisodeService } from './episode.service';
import { TemplateService, CreateTemplateDto } from './template.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('项目')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly versionService: VersionService,
    private readonly episodeService: EpisodeService,
    private readonly templateService: TemplateService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取项目列表' })
  async listProjects(@CurrentUser('id') userId: string) {
    return this.projectsService.listProjects(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  async getProject(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.projectsService.getProject(userId, id);
  }

  @Post()
  @ApiOperation({ summary: '创建项目' })
  async createProject(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  async deleteProject(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.projectsService.deleteProject(userId, id);
  }

  // ==================== Version Endpoints ====================

  @Post(':id/versions')
  @ApiOperation({ summary: '创建项目快照版本' })
  async createVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body?: { label?: string },
  ) {
    return this.versionService.createSnapshot(userId, id, body?.label);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '获取项目版本历史' })
  async listVersions(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.versionService.listVersions(userId, id);
  }

  @Get(':id/versions/:versionId')
  @ApiOperation({ summary: '获取版本详情' })
  async getVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionService.getVersion(userId, id, versionId);
  }

  @Post(':id/versions/:versionId/restore')
  @ApiOperation({ summary: '恢复到指定版本' })
  async restoreVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionService.restoreVersion(userId, id, versionId);
  }

  @Delete(':id/versions/:versionId')
  @ApiOperation({ summary: '删除版本' })
  async deleteVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionService.deleteVersion(userId, id, versionId);
  }

  // ==================== Episode Endpoints ====================

  @Get(':id/episodes')
  @ApiOperation({ summary: '获取项目剧集列表' })
  async listEpisodes(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.episodeService.listEpisodes(userId, id);
  }

  @Post(':id/episodes')
  @ApiOperation({ summary: '创建新剧集' })
  async createEpisode(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string },
  ) {
    return this.episodeService.createEpisode(userId, id, body);
  }

  @Get(':id/episodes/:episodeId')
  @ApiOperation({ summary: '获取剧集详情' })
  async getEpisode(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('episodeId') episodeId: string,
  ) {
    return this.episodeService.getEpisode(userId, id, episodeId);
  }

  @Put(':id/episodes/:episodeId')
  @ApiOperation({ summary: '更新剧集' })
  async updateEpisode(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('episodeId') episodeId: string,
    @Body() body: { title?: string; description?: string; status?: string },
  ) {
    return this.episodeService.updateEpisode(userId, id, episodeId, body);
  }

  @Delete(':id/episodes/:episodeId')
  @ApiOperation({ summary: '删除剧集' })
  async deleteEpisode(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('episodeId') episodeId: string,
  ) {
    return this.episodeService.deleteEpisode(userId, id, episodeId);
  }

  @Post(':id/storyboards/:storyboardId/assign/:episodeId')
  @ApiOperation({ summary: '将分镜分配到剧集' })
  async assignStoryboard(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('storyboardId') storyboardId: string,
    @Param('episodeId') episodeId: string,
  ) {
    return this.episodeService.assignStoryboardToEpisode(userId, id, storyboardId, episodeId);
  }

  @Get(':id/characters/shared')
  @ApiOperation({ summary: '获取项目共享角色列表' })
  async getSharedCharacters(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.episodeService.getSharedCharacters(userId, id);
  }

  // ==================== Template Endpoints ====================

  @Post(':id/save-as-template')
  @ApiOperation({ summary: '将项目保存为模板' })
  async saveAsTemplate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templateService.saveAsTemplate(userId, id, dto);
  }
}

@ApiTags('模板市场')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @ApiOperation({ summary: '获取模板列表' })
  async listTemplates(
    @CurrentUser('id') userId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.templateService.listTemplates(userId, category, search);
  }

  @Get('favorites')
  @ApiOperation({ summary: '获取收藏的模板' })
  async getFavorites(@CurrentUser('id') userId: string) {
    return this.templateService.getFavorites(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模板详情' })
  async getTemplate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.templateService.getTemplate(userId, id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: '从模板复刻项目' })
  async cloneFromTemplate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body?: { projectName?: string },
  ) {
    return this.templateService.cloneFromTemplate(userId, id, body?.projectName);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: '收藏/取消收藏模板' })
  async toggleFavorite(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.templateService.toggleFavorite(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新模板' })
  async updateTemplate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTemplateDto>,
  ) {
    return this.templateService.updateTemplate(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除模板' })
  async deleteTemplate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.templateService.deleteTemplate(userId, id);
  }
}
