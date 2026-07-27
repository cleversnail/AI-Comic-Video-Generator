import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComposeService } from './compose.service';
import { DistributeService, DistributeConfig } from './distribute.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('合成导出')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/compose')
export class ComposeController {
  constructor(
    private readonly composeService: ComposeService,
    private readonly distributeService: DistributeService,
  ) {}

  @Post()
  @ApiOperation({ summary: '合成项目视频' })
  async compose(@CurrentUser('id') userId: string, @Param('projectId') projectId: string) {
    return this.composeService.composeProject(userId, projectId);
  }

  // ==================== Distribute Endpoints ====================

  @Get('distribute/platforms')
  @ApiOperation({ summary: '获取支持的分发平台列表' })
  async getPlatforms() {
    return this.distributeService.getPlatforms();
  }

  @Get('distribute/platforms/:platformId')
  @ApiOperation({ summary: '获取单个平台配置' })
  async getPlatform(@Param('platformId') platformId: string) {
    return this.distributeService.getPlatform(platformId);
  }

  @Get('distribute/suggest/:platformId')
  @ApiOperation({ summary: '生成分发配置建议' })
  async generateConfig(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('platformId') platformId: string,
  ) {
    return this.distributeService.generateDistributeConfig(userId, projectId, platformId);
  }

  @Post('distribute/validate')
  @ApiOperation({ summary: '验证分发配置' })
  async validateConfig(@Body() config: DistributeConfig) {
    return this.distributeService.validateDistributeConfig(config);
  }

  @Post('distribute/export')
  @ApiOperation({ summary: '批量导出分发包' })
  async exportPackages(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() configs: DistributeConfig[],
  ) {
    return this.distributeService.exportDistributePackages(userId, projectId, configs);
  }
}
