import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GenerationsService } from './generations.service';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('生成任务')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/generations')
export class GenerationsController {
  constructor(private readonly generationsService: GenerationsService) {}

  @Post()
  @ApiOperation({ summary: '创建生成任务' })
  async create(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Body() dto: CreateGenerationDto) {
    return this.generationsService.createTask(userId, projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取生成任务列表' })
  async list(@CurrentUser('id') userId: string, @Param('projectId') projectId: string) {
    return this.generationsService.listTasks(userId, projectId);
  }

  @Get(':taskId')
  @ApiOperation({ summary: '获取生成任务详情' })
  async get(@CurrentUser('id') userId: string, @Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.generationsService.getTask(userId, projectId, taskId);
  }
}
