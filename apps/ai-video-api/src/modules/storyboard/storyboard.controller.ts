import { Controller, Post, Body, Param, Get, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoryboardService } from './storyboard.service';
import { GenerateShotsDto } from './dto/generate-shots.dto';
import { GeneratePreviewDto } from './dto/generate-preview.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('分镜')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/storyboard')
export class StoryboardController {
  constructor(private readonly storyboardService: StoryboardService) {}

  @Get()
  @ApiOperation({ summary: '获取项目的分镜列表' })
  async listShots(@CurrentUser('id') userId: string, @Param('projectId') projectId: string) {
    return this.storyboardService.listShots(userId, projectId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'AI 生成分镜' })
  async generateShots(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: GenerateShotsDto,
  ) {
    return this.storyboardService.generateShots(userId, projectId, dto);
  }

  @Post('shots/:shotId/preview')
  @ApiOperation({ summary: '生成分镜静态预览图' })
  async generatePreview(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('shotId') shotId: string,
    @Body() dto: GeneratePreviewDto,
  ) {
    return this.storyboardService.generatePreview(userId, projectId, shotId, dto);
  }

  @Delete('shots/:shotId')
  @ApiOperation({ summary: '删除分镜' })
  async deleteShot(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('shotId') shotId: string,
  ) {
    return this.storyboardService.deleteShot(userId, projectId, shotId);
  }
}
