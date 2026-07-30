import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { GenerateShotsDto } from './dto/generate-shots.dto';
import { UpdateShotDto } from './dto/update-shot.dto';

@Injectable()
export class StoryboardService {
  private readonly logger = new Logger(StoryboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  // ==================== Shot CRUD ====================

  async listShots(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const shots = await this.prisma.shot.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
    });
    return { shots };
  }

  async deleteShot(userId: string, projectId: string, shotId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const shot = await this.prisma.shot.findFirst({ where: { id: shotId, projectId } });
    if (!shot) throw new NotFoundException('Shot not found');
    await this.prisma.shot.delete({ where: { id: shotId } });
    return { success: true };
  }

  async updateShot(userId: string, projectId: string, shotId: string, dto: UpdateShotDto) {
    await this.verifyProjectAccess(userId, projectId);
    const shot = await this.prisma.shot.findFirst({ where: { id: shotId, projectId } });
    if (!shot) throw new NotFoundException('Shot not found');

    const params = (shot.params as any) || {};
    const mergedParams: any = { ...params };

    if (dto.characterIds !== undefined) {
      mergedParams.characterIds = dto.characterIds;
      if (dto.characterIds.length > 0) {
        const characters = await this.prisma.character.findMany({
          where: { projectId, id: { in: dto.characterIds } },
        });
        mergedParams.characters = characters.map((c) => c.name);
      } else {
        mergedParams.characters = [];
      }
    }
    if (dto.shotType !== undefined) mergedParams.shotType = dto.shotType;
    if (dto.cameraAngle !== undefined) mergedParams.cameraAngle = dto.cameraAngle;
    if (dto.cameraMovement !== undefined) mergedParams.cameraMovement = dto.cameraMovement;
    if (dto.emotion !== undefined) mergedParams.emotion = dto.emotion;
    if (dto.lighting !== undefined) mergedParams.lighting = dto.lighting;
    if (dto.dialogue !== undefined) mergedParams.dialogue = dto.dialogue;
    if (dto.narration !== undefined) mergedParams.narration = dto.narration;
    if (dto.subtitle !== undefined) mergedParams.subtitle = dto.subtitle;
    if (dto.title !== undefined) mergedParams.title = dto.title;
    if (dto.description !== undefined) mergedParams.description = dto.description;

    const updateData: any = { params: mergedParams };
    if (dto.prompt !== undefined) updateData.prompt = dto.prompt;
    if (dto.negativePrompt !== undefined) updateData.negativePrompt = dto.negativePrompt;
    if (dto.duration !== undefined) updateData.duration = dto.duration;

    const updated = await this.prisma.shot.update({ where: { id: shotId }, data: updateData });
    return { data: updated };
  }

  // ==================== AI Generation ====================

  async generateShots(userId: string, projectId: string, dto: GenerateShotsDto) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('Project not found');

    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');
    const characters = await this.getCharactersForGeneration(projectId, dto.characterIds);
    const systemPrompt = this.buildSystemPrompt(dto.style);
    const userPrompt = this.buildUserPrompt(dto.story, characters);

    let shotsData: any[];
    try {
      const result = await this.callLLM(modelId, apiKey, baseUrl, systemPrompt, userPrompt);
      shotsData = this.parseShotsResult(result.content);
    } catch (error: any) {
      this.logger.error(`Failed to generate shots: ${error.message}`);
      throw new BadRequestException(`分镜生成失败: ${error.message}`);
    }

    await this.prisma.shot.deleteMany({ where: { projectId } });
    const storyboard = await this.getOrCreateStoryboard(projectId);

    const shots = await Promise.all(
      shotsData.map(async (shot, index) => {
        const shotCharacterIds = this.matchCharactersToShot(shot.characters || [], characters);
        return this.prisma.shot.create({
          data: {
            projectId,
            storyboardId: storyboard.id,
            sequence: index + 1,
            prompt: shot.prompt || '',
            negativePrompt: shot.negativePrompt || '',
            duration: shot.duration || 3000,
            params: {
              description: shot.description || '',
              title: shot.title || `分镜 ${index + 1}`,
              characters: shot.characters || [],
              characterIds: shotCharacterIds,
              scene: shot.scene || '',
              emotion: shot.emotion || '',
              dialogue: shot.dialogue || '',
              narration: shot.narration || '',
              subtitle: shot.subtitle || '',
              camera: shot.camera || {},
            },
            status: 'draft',
          },
        });
      })
    );

    return { data: shots };
  }

  // ==================== Private Helpers ====================

  private async getCharactersForGeneration(projectId: string, characterIds?: string[]) {
    const where: any = { projectId };
    if (characterIds?.length) where.id = { in: characterIds };
    const characters = await this.prisma.character.findMany({ where });
    return characters.map((c) => ({
      id: c.id,
      name: c.name,
      description: this.buildCharacterDescription(c),
      lockLevel: c.lockLevel || 'medium',
    }));
  }

  private buildCharacterDescription(character: any): string {
    const parts: string[] = [`姓名：${character.name}`];
    if (character.gender) parts.push(`性别：${character.gender}`);
    if (character.age) parts.push(`年龄：${character.age}`);
    if (character.appearance) parts.push(`外貌：${character.appearance}`);
    if (character.outfit) parts.push(`服装：${character.outfit}`);
    if (character.personality) parts.push(`性格：${character.personality}`);
    if (character.lockLevel) parts.push(`一致性要求：${this.getLockLevelLabel(character.lockLevel)}`);
    return parts.join('，');
  }

  private getLockLevelLabel(lockLevel: string): string {
    const map: Record<string, string> = {
      loose: '宽松（允许较大变化）',
      medium: '中等（保持基本特征）',
      strict: '严格（高度一致）',
    };
    return map[lockLevel] || lockLevel;
  }

  private matchCharactersToShot(shotCharacterNames: string[], characters: Array<{ id: string; name: string }>): string[] {
    const matchedIds: string[] = [];
    for (const name of shotCharacterNames) {
      const normalizedName = this.normalizeCharacterName(name);
      const matched = characters.find((c) => this.normalizeCharacterName(c.name) === normalizedName);
      if (matched && !matchedIds.includes(matched.id)) matchedIds.push(matched.id);
    }
    return matchedIds;
  }

  private normalizeCharacterName(name: string): string {
    return name.replace(/[^一-龥a-zA-Z0-9]/g, '').toLowerCase().trim();
  }

  private async getOrCreateStoryboard(projectId: string) {
    let storyboard = await this.prisma.storyboard.findFirst({ where: { projectId } });
    if (!storyboard) {
      storyboard = await this.prisma.storyboard.create({
        data: { projectId, sequence: 1, description: 'AI 生成的分镜' },
      });
    }
    return storyboard;
  }

  private async callLLM(modelId: string, apiKey: string, baseUrl: string | undefined, systemPrompt: string, userPrompt: string) {
    try {
      const llmAdapter = this.adapterFactory.getLLMAdapter(modelId);
      const result = await llmAdapter.generateText(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          maxTokens: 4000,
        },
        { apiKey, baseUrl }
      );
      return { content: result.content, usage: result.usage };
    } catch (error: any) {
      this.logger.error(`LLM adapter error for model ${modelId}: ${error.message}`);
      throw new Error(`AI 调用失败: ${error.message}`);
    }
  }

  private buildSystemPrompt(style?: string): string {
    return `你是一个专业的漫剧分镜师。你的任务是将用户输入的故事情节拆分为多个分镜。

要求：
1. 每个分镜应该是一个独立的画面，时长 3-5 秒
2. 为每个分镜生成适合 AI 视频生成的英文提示词
3. 提示词应包含：画面主体、角色动作/表情、场景、镜头语言、光影、情绪
4. 返回严格的 JSON 数组格式

${style ? `5. 画面风格：${style}` : ''}

返回格式（必须是纯 JSON，不要有 markdown 代码块标记）：
[
  {
    "title": "分镜标题（中文）",
    "description": "画面描述（中文）",
    "characters": ["出场角色名"],
    "scene": "场景描述",
    "emotion": "情绪",
    "duration": 3000,
    "dialogue": "台词（如有）",
    "narration": "旁白（如有）",
    "subtitle": "字幕",
    "prompt": "English prompt for AI video generation",
    "negativePrompt": "blurry, deformed, low quality",
    "camera": {
      "shotSize": "close_up|medium|wide|long",
      "angle": "eye_level|low_angle|high_angle|pov",
      "movement": "static|push_in|pull_out|pan|follow",
      "lighting": "backlight|side_light|soft_light|golden_hour",
      "mood": "tense|warm|sad|romantic|mysterious|cheerful"
    }
  }
]`;
  }

  private buildUserPrompt(story: string, characters?: Array<{ name: string; description: string }>): string {
    let prompt = `请将以下故事拆分为 4-8 个分镜：\n\n${story}`;
    if (characters?.length) {
      prompt += `\n\n项目中的角色信息（请确保分镜中的角色与以下描述一致）：\n${characters.map((c, i) => `${i + 1}. ${c.name} - ${c.description}`).join('\n')}`;
    }
    prompt += '\n\n请返回纯 JSON 数组，不要有任何额外文字。';
    return prompt;
  }

  private parseShotsResult(content: string): any[] {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/```\s*$/, '');
    }
    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('LLM 返回的不是数组');
      return parsed;
    } catch (error: any) {
      this.logger.error(`Failed to parse shots: ${error.message}`);
      throw new Error('AI 返回内容解析失败，请重试');
    }
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
