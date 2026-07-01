import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComposeService } from './compose.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('合成导出')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/compose')
export class ComposeController {
  constructor(private readonly composeService: ComposeService) {}

  @Post()
  @ApiOperation({ summary: '合成项目视频' })
  async compose(@CurrentUser('id') userId: string, @Param('projectId') projectId: string) {
    return this.composeService.composeProject(userId, projectId);
  }
}
