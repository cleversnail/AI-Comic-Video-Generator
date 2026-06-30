import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@ApiTags('项目')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: '获取项目列表' })
  async listProjects() {
    const userId = 'temp-user-id';
    return this.projectsService.listProjects(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  async getProject(@Param('id') id: string) {
    const userId = 'temp-user-id';
    return this.projectsService.getProject(userId, id);
  }

  @Post()
  @ApiOperation({ summary: '创建项目' })
  async createProject(@Body() dto: CreateProjectDto) {
    const userId = 'temp-user-id';
    return this.projectsService.createProject(userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  async deleteProject(@Param('id') id: string) {
    const userId = 'temp-user-id';
    return this.projectsService.deleteProject(userId, id);
  }
}
