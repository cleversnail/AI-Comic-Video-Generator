import { Controller, Post, Patch, Body, Param, Get, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoryboardService } from './storyboard.service';
import { StoryboardPreviewService } from './storyboard-preview.service';
import { StoryboardTtsService } from './storyboard-tts.service';
import { ScriptAuditService } from './script-audit.service';
import { GenerateShotsDto } from './dto/generate-shots.dto';
import { GeneratePreviewDto } from './dto/generate-preview.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { GenerateTtsDto, GenerateTtsForShotsDto } from './dto/generate-tts.dto';
import { AssistantChatDto } from './dto/assistant-chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ModelsService } from '../models/models.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';

@ApiTags('分镜')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/storyboard')
export class StoryboardController {
  constructor(
    private readonly storyboardService: StoryboardService,
    private readonly previewService: StoryboardPreviewService,
    private readonly ttsService: StoryboardTtsService,
    private readonly scriptAuditService: ScriptAuditService,
    private readonly modelsService: ModelsService,
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

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
    return this.previewService.generatePreview(userId, projectId, shotId, dto);
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
  @ApiOperation({ summary: '更新分镜参数' })
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
    return this.ttsService.generateTtsForShot(userId, projectId, shotId, dto.voiceId, dto.speed);
  }

  @Post('tts/batch')
  @ApiOperation({ summary: '批量为分镜生成 TTS 配音' })
  async generateTtsForShots(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: GenerateTtsForShotsDto,
  ) {
    return this.ttsService.generateTtsForShots(userId, projectId, dto.shotIds, dto.voiceId, dto.speed);
  }

  @Post('assistant')
  @ApiOperation({ summary: '创作助手 AI 对话' })
  async assistantChat(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: AssistantChatDto,
  ) {
    // Verify project access
    const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new Error('项目不存在');

    // Get project context
    const characters = await this.prisma.character.findMany({ where: { projectId } });
    const shots = await this.prisma.shot.findMany({ where: { projectId }, orderBy: { sequence: 'asc' } });

    const contextParts: string[] = [];
    contextParts.push(`项目名称：${project.name}`);
    if (project.style) contextParts.push(`风格：${project.style}`);
    if (characters.length > 0) {
      contextParts.push(`角色：${characters.map(c => c.name).join('、')}`);
    }
    if (shots.length > 0) {
      contextParts.push(`已有 ${shots.length} 个分镜`);
    }

    const systemPrompt = `你是一个专业的漫剧创作助手。你正在帮助用户创作名为「${project.name}」的漫剧项目。

项目上下文：
${contextParts.join('\n')}

你的能力：
1. 帮助用户优化故事剧情和台词
2. 提供分镜建议和镜头语言指导
3. 帮助优化角色描述和提示词
4. 回答关于漫剧创作的问题
5. 提供创意灵感和剧情建议

请用简洁、专业的语气回答，必要时给出具体的建议和示例。`;

    // Get LLM API key
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');
    const llmAdapter = this.adapterFactory.getLLMAdapter(modelId);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(dto.history || []),
      { role: 'user' as const, content: dto.message },
    ];

    const result = await llmAdapter.generateText(
      { messages, temperature: 0.7, maxTokens: 2000 },
      { apiKey, baseUrl }
    );

    return { data: { reply: result.content } };
  }

  @Post('audit')
  @ApiOperation({ summary: '审计剧本质量' })
  async auditScript(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.scriptAuditService.auditProject(userId, projectId);
  }
}
