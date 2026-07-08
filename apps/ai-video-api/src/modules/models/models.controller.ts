import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateModelPreferenceDto } from './dto/update-model-preference.dto';

@ApiTags('模型与 API Key')
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

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
  @ApiOperation({ summary: '添加并验证 API Key' })
  async createApiKey(@Body() dto: CreateApiKeyDto) {
    // TODO: 从 JWT 获取 userId
    const userId = 'temp-user-id';
    return this.modelsService.createApiKey(userId, dto);
  }

  @Get('api-keys/my')
  @ApiOperation({ summary: '获取我的 API Key 列表' })
  async listMyApiKeys(@Query('capability') capability?: string) {
    const userId = 'temp-user-id';
    return this.modelsService.listUserApiKeys(userId, capability);
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: '删除 API Key' })
  async deleteApiKey(@Param('id') id: string) {
    const userId = 'temp-user-id';
    return this.modelsService.deleteApiKey(userId, id);
  }

  @Post('preferences')
  @ApiOperation({ summary: '更新项目级模型配置' })
  async updatePreference(@Body() dto: UpdateModelPreferenceDto) {
    const userId = 'temp-user-id';
    return this.modelsService.updateProjectPreference(userId, dto);
  }

  @Get('preferences/:projectId')
  @ApiOperation({ summary: '获取项目级模型配置' })
  async getPreference(@Param('projectId') projectId: string) {
    const userId = 'temp-user-id';
    return this.modelsService.getProjectPreference(userId, projectId);
  }
}
