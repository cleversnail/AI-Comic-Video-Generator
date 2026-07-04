import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KeyframeService } from './keyframe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('关键帧')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/storyboard')
export class KeyframeController {
  constructor(private readonly keyframeService: KeyframeService) {}

  @Post('shots/:shotId/keyframes')
  @ApiOperation({ summary: '为单个分镜生成首尾帧' })
  async generateKeyframes(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('shotId') shotId: string,
  ) {
    return this.keyframeService.generateKeyframes(userId, projectId, shotId);
  }

  @Post('keyframes/all')
  @ApiOperation({ summary: '批量生成所有分镜的首尾帧' })
  async generateAllKeyframes(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.keyframeService.generateAllKeyframes(userId, projectId);
  }

  @Post('shots/:shotId/keyframes/:frameType')
  @ApiOperation({ summary: '手动上传首帧或尾帧' })
  async uploadKeyframe(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('shotId') shotId: string,
    @Param('frameType') frameType: 'first' | 'last',
    @Body('imageUrl') imageUrl: string,
  ) {
    return this.keyframeService.uploadKeyframe(userId, projectId, shotId, frameType, imageUrl);
  }
}
