import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { GenerateShotsDto } from './dto/generate-shots.dto';
import { GeneratePreviewDto } from './dto/generate-preview.dto';

@Injectable()
export class StoryboardService {
  private readonly logger = new Logger(StoryboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  async listShots(projectId: string) {
    const shots = await this.prisma.shot.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
    });

    return { data: shots };
  }

  async generateShots(projectId: string, dto: GenerateShotsDto) {
    const userId = 'temp-user-id';

    // 验证项目存在
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 解析 API Key 和模型
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');

    // 构建 LLM 调用提示词
    const systemPrompt = this.buildSystemPrompt(dto.style);
    const userPrompt = this.buildUserPrompt(dto.story, dto.characterDescriptions);

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
      shotsData.map(async (shot, index) =>
        this.prisma.shot.create({
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
              scene: shot.scene || '',
              emotion: shot.emotion || '',
              dialogue: shot.dialogue || '',
              narration: shot.narration || '',
              subtitle: shot.subtitle || '',
              camera: shot.camera || {},
            },
            status: 'draft',
          },
        })
      )
    );

    return { data: shots };
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

  private buildUserPrompt(story: string, characterDescriptions?: string[]): string {
    let prompt = `请将以下故事拆分为 4-8 个分镜：\n\n${story}`;
    
    if (characterDescriptions && characterDescriptions.length > 0) {
      prompt += `\n\n角色信息：\n${characterDescriptions.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
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

  async deleteShot(projectId: string, shotId: string) {
    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });

    if (!shot) {
      throw new NotFoundException('Shot not found');
    }

    await this.prisma.shot.delete({ where: { id: shotId } });
    return { success: true };
  }

  async generatePreview(projectId: string, shotId: string, dto: GeneratePreviewDto) {
    const userId = 'temp-user-id';

    const shot = await this.prisma.shot.findFirst({
      where: { id: shotId, projectId },
    });

    if (!shot) {
      throw new NotFoundException('Shot not found');
    }

    // 解析图像生成模型的 API Key
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'image');

    // 获取分镜参数
    const params = shot.params as any;
    const prompt = dto.customPrompt || shot.prompt || params?.description || '';

    if (!prompt) {
      throw new BadRequestException('该分镜没有提示词，无法生成预览');
    }

    // 根据项目比例确定图片尺寸
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const aspectRatio = project?.aspectRatio || '9:16';
    const dimensions = this.getDimensionsByAspectRatio(aspectRatio);

    this.logger.log(`Generating preview for shot ${shotId} using ${modelId}, prompt: ${prompt.substring(0, 80)}...`);

    let imageUrl: string;
    try {
      const imageAdapter = this.adapterFactory.getImageAdapter(modelId);
      const result = await imageAdapter.generateImage(
        {
          prompt,
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
