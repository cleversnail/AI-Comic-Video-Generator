import { Controller, Post, Body, Param, Get, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StoryboardService } from './storyboard.service';
import { GenerateShotsDto } from './dto/generate-shots.dto';
import { GeneratePreviewDto } from './dto/generate-preview.dto';

@ApiTags('分镜')
@Controller('projects/:projectId/storyboard')
export class StoryboardController {
  constructor(private readonly storyboardService: StoryboardService) {}

  @Get()
  @ApiOperation({ summary: '获取项目的分镜列表' })
  async listShots(@Param('projectId') projectId: string) {
    return this.storyboardService.listShots(projectId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'AI 生成分镜' })
  async generateShots(
    @Param('projectId') projectId: string,
    @Body() dto: GenerateShotsDto,
  ) {
    return this.storyboardService.generateShots(projectId, dto);
  }

  @Post('shots/:shotId/preview')
  @ApiOperation({ summary: '生成分镜静态预览图' })
  async generatePreview(
    @Param('projectId') projectId: string,
    @Param('shotId') shotId: string,
    @Body() dto: GeneratePreviewDto,
  ) {
    return this.storyboardService.generatePreview(projectId, shotId, dto);
  }

  @Delete('shots/:shotId')
  @ApiOperation({ summary: '删除分镜' })
  async deleteShot(
    @Param('projectId') projectId: string,
    @Param('shotId') shotId: string,
  ) {
    return this.storyboardService.deleteShot(projectId, shotId);
  }
}
