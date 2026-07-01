import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('项目')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

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
}
