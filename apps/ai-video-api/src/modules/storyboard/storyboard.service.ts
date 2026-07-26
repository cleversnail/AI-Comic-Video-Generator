import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { GenerateShotsDto } from './dto/generate-shots.dto';
import { GeneratePreviewDto } from './dto/generate-preview.dto';
import { UpdateShotDto } from './dto/update-shot.dto';

@Injectable()
export class StoryboardService {
  private readonly logger = new Logger(StoryboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  async listShots(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const shots = await this.prisma.shot.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
    });

    return { data: shots };
  }

  async generateShots(userId: string, projectId: string, dto: GenerateShotsDto) {

    // 验证项目存在
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 解析 API Key 和模型
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');

    // 获取项目中的角色信息（如果提供了 characterIds）
    const characters = await this.getCharactersForGeneration(projectId, dto.characterIds);

    // 构建 LLM 调用提示词
    const systemPrompt = this.buildSystemPrompt(dto.style);
    const userPrompt = this.buildUserPrompt(dto.story, characters);

    // 调用 LLM 生成分镜
    let shotsData: any[];
    try {
      // 通过 AdapterFactory 获取 LLM Adapter
      const { AdapterFactory } = await import('../../common/adapters/adapter.factory');
      // 我们直接使用 ModelsService 中已注册的 adapter
      const result = await this.callLLM(modelId, apiKey, baseUrl, systemPrompt, userPrompt);

      // 解析 LLM 返回的 JSON
      shotsData = this.parseShotsResult(result.content);
    } catch (error: any) {
      this.logger.error(`Failed to generate shots: ${error.message}`, error.stack);
      throw new BadRequestException(`分镜生成失败: ${error.message}`);
    }

    // 删除旧分镜
    await this.prisma.shot.deleteMany({ where: { projectId } });

    // 写入新分镜
    const storyboard = await this.getOrCreateStoryboard(projectId);
    const shots = await Promise.all(
      shotsData.map(async (shot, index) => {
        // 尝试将 LLM 返回的角色名匹配到项目中的角色 ID
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

  /**
   * 获取用于分镜生成的角色信息
   */
  private async getCharactersForGeneration(
    projectId: string,
    characterIds?: string[],
  ): Promise<Array<{ id: string; name: string; description: string; lockLevel: string }>> {
    let where: any = { projectId };
    if (characterIds && characterIds.length > 0) {
      where = { projectId, id: { in: characterIds } };
    }

    const characters = await this.prisma.character.findMany({ where });

    return characters.map((c) => ({
      id: c.id,
      name: c.name,
      description: this.buildCharacterDescription(c),
      lockLevel: c.lockLevel || 'medium',
    }));
  }

  /**
   * 构建角色描述文本（用于注入到分镜生成提示词中）
   */
  private buildCharacterDescription(character: any): string {
    const parts: string[] = [];
    parts.push(`姓名：${character.name}`);
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

  /**
   * 将 LLM 返回的角色名匹配到项目中的角色 ID
   */
  private matchCharactersToShot(
    shotCharacterNames: string[],
    characters: Array<{ id: string; name: string }>,
  ): string[] {
    const matchedIds: string[] = [];
    for (const name of shotCharacterNames) {
      const normalizedName = this.normalizeCharacterName(name);
      const matched = characters.find((c) => {
        const normalizedCharName = this.normalizeCharacterName(c.name);
        return normalizedName === normalizedCharName;
      });
      if (matched && !matchedIds.includes(matched.id)) {
        matchedIds.push(matched.id);
      }
    }
    return matchedIds;
  }

  /**
   * 标准化角色名（用于匹配）
   */
  private normalizeCharacterName(name: string): string {
    return name
      .replace(/[^一-龥a-zA-Z0-9]/g, '')
      .toLowerCase()
      .trim();
  }

  private async getOrCreateStoryboard(projectId: string) {
    let storyboard = await this.prisma.storyboard.findFirst({
      where: { projectId },
    });

    if (!storyboard) {
      storyboard = await this.prisma.storyboard.create({
        data: {
          projectId,
          sequence: 1,
          description: 'AI 生成的分镜',
        },
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
    "prompt": "English prompt for AI video generation, including subject, action, camera, lighting, mood",
    "negativePrompt": "blurry, deformed, low quality",
    "camera": {
      "shotSize": "close_up|medium|wide|long",
      "angle": "eye_level|low_angle|high_angle|pov|over_shoulder",
      "movement": "static|push_in|pull_out|pan|follow|orbit",
      "lighting": "backlight|side_light|soft_light|golden_hour",
      "mood": "tense|warm|sad|romantic|mysterious|cheerful"
    }
  }
]`;
  }

  private buildUserPrompt(story: string, characters?: Array<{ name: string; description: string; lockLevel: string }>): string {
    let prompt = `请将以下故事拆分为 4-8 个分镜：\n\n${story}`;

    if (characters && characters.length > 0) {
      prompt += `\n\n项目中的角色信息（请确保分镜中的角色与以下描述一致，并在每个分镜的 characters 字段中填写角色名）：\n${characters.map((c, i) => `${i + 1}. ${c.name} - ${c.description}`).join('\n')}`;
    }

    prompt += '\n\n请返回纯 JSON 数组，不要有任何额外文字。';

    return prompt;
  }

  private parseShotsResult(content: string): any[] {
    // 清除可能的 markdown 代码块标记
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/```\s*$/, '');
    }

    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        throw new Error('LLM 返回的不是数组');
      }
      return parsed;
    } catch (error: any) {
      this.logger.error(`Failed to parse shots: ${error.message}\nContent: ${content}`);
      throw new Error('AI 返回内容解析失败，请重试');
    }
  }

  async deleteShot(userId: string, projectId: string, shotId: string) {
    await this.verifyProjectAccess(userId, projectId);
    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });

    if (!shot) {
      throw new NotFoundException('Shot not found');
    }

    await this.prisma.shot.delete({ where: { id: shotId } });
    return { success: true };
  }

  async updateShot(userId: string, projectId: string, shotId: string, dto: UpdateShotDto) {
    await this.verifyProjectAccess(userId, projectId);
    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });
    if (!shot) throw new NotFoundException('Shot not found');

    const params = (shot.params as any) || {};
    const mergedParams: any = { ...params };

    if (dto.characterIds !== undefined) {
      mergedParams.characterIds = dto.characterIds;
      // 同步更新 characters 名称列表（用于前端展示和 LLM 再生成）
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

    const updated = await this.prisma.shot.update({
      where: { id: shotId },
      data: updateData,
    });

    return { data: updated };
  }
  async generatePreview(userId: string, projectId: string, shotId: string, dto: GeneratePreviewDto) {

    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });

    if (!shot) {
      throw new NotFoundException('Shot not found');
    }

    // 解析图像生成模型的 API Key
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'image');

    // 获取分镜参数和绑定角色
    const params = shot.params as any;
    const prompt = dto.customPrompt || shot.prompt || params?.description || '';

    if (!prompt) {
      throw new BadRequestException('该分镜没有提示词，无法生成预览');
    }

    // 根据绑定的角色 ID 获取角色信息，并注入到提示词中
    const characterPrompt = await this.buildCharacterPromptForShot(projectId, params?.characterIds || []);
    const finalPrompt = characterPrompt ? `${characterPrompt}, ${prompt}` : prompt;

    // 根据项目比例确定图片尺寸
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const aspectRatio = project?.aspectRatio || '9:16';
    const dimensions = this.getDimensionsByAspectRatio(aspectRatio);

    this.logger.log(`Generating preview for shot ${shotId} using ${modelId}, prompt: ${finalPrompt.substring(0, 80)}...`);

    let imageUrl: string;
    try {
      const imageAdapter = this.adapterFactory.getImageAdapter(modelId);
      const result = await imageAdapter.generateImage(
        {
          prompt: finalPrompt,
          width: dimensions.width,
          height: dimensions.height,
        },
        { apiKey, baseUrl }
      );
      imageUrl = result.url;
    } catch (error: any) {
      this.logger.error(`Preview generation failed: ${error.message}`, error.stack);
      throw new BadRequestException(`预览图生成失败: ${error.message}`);
    }

    // 更新分镜的预览图 URL 和状态
    const updatedShot = await this.prisma.shot.update({
      where: { id: shotId },
      data: {
        resultUrl: imageUrl,
        status: 'previewed',
      },
    });

    this.logger.log(`Preview generated successfully for shot ${shotId}: ${imageUrl}`);

    return {
      data: {
        shotId,
        previewUrl: imageUrl,
        status: 'previewed',
      },
    };
  }

  /**
   * 为分镜构建角色一致性提示词
   */
  private async buildCharacterPromptForShot(
    projectId: string,
    characterIds: string[],
  ): Promise<string> {
    if (!characterIds || characterIds.length === 0) return '';

    const characters = await this.prisma.character.findMany({
      where: {
        projectId,
        id: { in: characterIds },
      },
    });

    if (characters.length === 0) return '';

    const prompts: string[] = [];
    for (const character of characters) {
      const parts: string[] = [];
      parts.push(`same character as ${character.name}`);
      if (character.appearance) parts.push(character.appearance);
      if (character.outfit) parts.push(`wearing ${character.outfit}`);

      // 根据锁定强度追加一致性约束
      const lockLevel = character.lockLevel || 'medium';
      if (lockLevel === 'strict') {
        parts.push('highly consistent appearance, identical character design, same face and outfit');
      } else if (lockLevel === 'medium') {
        parts.push('consistent character design, same face and outfit style');
      } else {
        parts.push('similar character style');
      }

      // 如果有主图或四视图，提示使用参考
      if (character.mainImage) {
        parts.push('refer to main reference image');
      }
      if (character.viewImages) {
        const viewCount = Object.values(character.viewImages).filter(Boolean).length;
        if (viewCount > 0) {
          parts.push(`refer to ${viewCount}-view character sheet for consistency`);
        }
      }

      prompts.push(parts.join(', '));
    }

    return 'featuring ' + prompts.join('; and ');
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');
  }

  /**
   * 为分镜生成 TTS 音频
   */
  async generateTtsForShot(userId: string, projectId: string, shotId: string, voiceId?: string, speed?: number) {
    await this.verifyProjectAccess(userId, projectId);

    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });
    if (!shot) throw new NotFoundException('Shot not found');

    const params = shot.params as any;
    const dialogue = params?.dialogue || '';
    const narration = params?.narration || '';
    const subtitle = params?.subtitle || '';

    const text = dialogue || narration || subtitle;
    if (!text) {
      throw new BadRequestException('该分镜没有台词、旁白或字幕，无法生成配音');
    }

    // 获取 TTS API Key
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'tts');

    try {
      const ttsAdapter = this.adapterFactory.getTTSAdapter(modelId);
      const result = await ttsAdapter.generateSpeech(
        {
          text,
          voiceId: voiceId || 'male-qn-qingse',
          speed: speed || 1.0,
          language: 'zh',
        },
        { apiKey, baseUrl }
      );

      // 更新分镜的音频 URL 和时长
      const updatedParams = { ...params, audioUrl: result.audioUrl };
      const updatedDuration = result.duration ? Math.ceil(result.duration * 1000) : shot.duration;

      const updatedShot = await this.prisma.shot.update({
        where: { id: shotId },
        data: {
          params: updatedParams,
          duration: updatedDuration,
        },
      });

      return {
        data: {
          shotId,
          audioUrl: result.audioUrl,
          duration: updatedDuration,
        },
      };
    } catch (error: any) {
      this.logger.error(`TTS generation failed for shot ${shotId}: ${error.message}`);
      throw new BadRequestException(`配音生成失败: ${error.message}`);
    }
  }

  /**
   * 批量为分镜生成 TTS 音频
   */
  async generateTtsForShots(
    userId: string,
    projectId: string,
    shotIds?: string[],
    voiceId?: string,
    speed?: number,
  ) {
    await this.verifyProjectAccess(userId, projectId);

    let shots: any[];
    if (shotIds && shotIds.length > 0) {
      shots = await this.prisma.shot.findMany({
        where: { projectId, id: { in: shotIds } },
        orderBy: { sequence: 'asc' },
      });
    } else {
      shots = await this.prisma.shot.findMany({
        where: { projectId },
        orderBy: { sequence: 'asc' },
      });
    }

    if (shots.length === 0) {
      throw new BadRequestException('没有找到需要生成配音的分镜');
    }

    // 过滤出有台词/旁白/字幕的分镜
    const shotsWithText = shots.filter((shot) => {
      const params = shot.params as any;
      return params?.dialogue || params?.narration || params?.subtitle;
    });

    if (shotsWithText.length === 0) {
      throw new BadRequestException('选中的分镜中没有台词、旁白或字幕');
    }

    // 获取 TTS API Key
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'tts');
    const ttsAdapter = this.adapterFactory.getTTSAdapter(modelId);

    const results: Array<{ shotId: string; audioUrl: string; duration: number; status: string }> = [];
    const errors: Array<{ shotId: string; error: string }> = [];

    for (const shot of shotsWithText) {
      const params = shot.params as any;
      const text = params?.dialogue || params?.narration || params?.subtitle;

      try {
        const result = await ttsAdapter.generateSpeech(
          {
            text,
            voiceId: voiceId || 'male-qn-qingse',
            speed: speed || 1.0,
            language: 'zh',
          },
          { apiKey, baseUrl }
        );

        const updatedParams = { ...params, audioUrl: result.audioUrl };
        const updatedDuration = result.duration ? Math.ceil(result.duration * 1000) : shot.duration;

        await this.prisma.shot.update({
          where: { id: shot.id },
          data: {
            params: updatedParams,
            duration: updatedDuration,
          },
        });

        results.push({
          shotId: shot.id,
          audioUrl: result.audioUrl,
          duration: updatedDuration,
          status: 'success',
        });
      } catch (error: any) {
        this.logger.error(`TTS failed for shot ${shot.id}: ${error.message}`);
        errors.push({ shotId: shot.id, error: error.message });
        results.push({
          shotId: shot.id,
          audioUrl: '',
          duration: shot.duration,
          status: 'failed',
        });
      }
    }

    return {
      data: {
        total: shotsWithText.length,
        success: results.filter((r) => r.status === 'success').length,
        failed: errors.length,
        results,
      },
    };
  }

  private getDimensionsByAspectRatio(ratio: string): { width: number; height: number } {
    switch (ratio) {
      case '16:9':
        return { width: 1024, height: 576 };
      case '1:1':
        return { width: 768, height: 768 };
      case '9:16':
      default:
        return { width: 576, height: 1024 };
    }
  }
}
