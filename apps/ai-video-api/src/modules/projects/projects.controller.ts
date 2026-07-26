import { Controller, Get, Post, Put, Patch, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { VersionService } from './version.service';
import { EpisodeService } from './episode.service';
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
}
