import { Controller, Post, Patch, Body, Param, Get, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoryboardService } from './storyboard.service';
import { GenerateShotsDto } from './dto/generate-shots.dto';
import { GeneratePreviewDto } from './dto/generate-preview.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { GenerateTtsDto, GenerateTtsForShotsDto } from './dto/generate-tts.dto';
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
  async listShots(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
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

  @Patch('shots/:shotId')
  @ApiOperation({ summary: '更新分镜参数（角色绑定、景别、角度、情绪等）' })
  async updateShot(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('shotId') shotId: string,
    @Body() dto: UpdateShotDto,
  ) {
    return this.storyboardService.updateShot(userId, projectId, shotId, dto);
  }

  @Post('shots/:shotId/tts')
  @ApiOperation({ summary: '为单个分镜生成 TTS 配音' })
  async generateTtsForShot(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('shotId') shotId: string,
    @Body() dto: GenerateTtsDto,
  ) {
    return this.storyboardService.generateTtsForShot(userId, projectId, shotId, dto.voiceId, dto.speed);
  }

  @Post('tts/batch')
  @ApiOperation({ summary: '批量为分镜生成 TTS 配音' })
  async generateTtsForShots(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: GenerateTtsForShotsDto,
  ) {
    return this.storyboardService.generateTtsForShots(userId, projectId, dto.shotIds, dto.voiceId, dto.speed);
  }
}
