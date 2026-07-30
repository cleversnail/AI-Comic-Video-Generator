import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import { CostService } from './cost.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateModelPreferenceDto } from './dto/update-model-preference.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('模型与 API Key')
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly costService: CostService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取模型列表' })
  async listModels(@Query('capability') capability?: string) {
    return this.modelsService.listModels(capability);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模型详情' })
  async getModel(@Param('id') id: string) {
    return this.modelsService.getModel(id);
  }

  @Post('api-keys')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '添加并验证 API Key' })
  async createApiKey(@CurrentUser('id') userId: string, @Body() dto: CreateApiKeyDto) {
    return this.modelsService.createApiKey(userId, dto);
  }

  @Get('api-keys/my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取我的 API Key 列表' })
  async listMyApiKeys(@CurrentUser('id') userId: string, @Query('capability') capability?: string) {
    return this.modelsService.listUserApiKeys(userId, capability);
  }

  @Delete('api-keys/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除 API Key' })
  async deleteApiKey(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.modelsService.deleteApiKey(userId, id);
  }

  @Put('api-keys/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新 API Key 配置' })
  async updateApiKey(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: { apiKey?: string; alias?: string; isDefault?: boolean },
  ) {
    return this.modelsService.updateApiKey(userId, id, dto);
  }

  @Post('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新项目级模型配置' })
  async updatePreference(@CurrentUser('id') userId: string, @Body() dto: UpdateModelPreferenceDto) {
    return this.modelsService.updateProjectPreference(userId, dto);
  }

  @Get('preferences/:projectId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取项目级模型配置' })
  async getPreference(@CurrentUser('id') userId: string, @Param('projectId') projectId: string) {
    return this.modelsService.getProjectPreference(userId, projectId);
  }

  @Get('cost/summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取用户成本统计' })
  async getCostSummary(@CurrentUser('id') userId: string) {
    return this.costService.getUserCostSummary(userId);
  }

  @Get('cost/project/:projectId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取项目成本统计' })
  async getProjectCost(@CurrentUser('id') userId: string, @Param('projectId') projectId: string) {
    return this.costService.getProjectCostSummary(userId, projectId);
  }
}
