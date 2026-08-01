import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';

export interface SplitConfig {
  /** 目标每集时长（秒） */
  targetDuration?: number;
  /** 目标集数 */
  targetEpisodes?: number;
  /** 按章节分割（章节标题模式） */
  splitByChapter?: boolean;
  /** 章节标题正则表达式 */
  chapterPattern?: string;
}

export interface SplitResult {
  totalEpisodes: number;
  episodes: Array<{
    number: number;
    title: string;
    content: string;
    estimatedDuration: number;
    wordCount: number;
  }>;
}

@Injectable()
export class NovelSplitService {
  private readonly logger = new Logger(NovelSplitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  /**
   * 预览分割结果（不实际创建）
   */
  async previewSplit(userId: string, projectId: string, novelText: string, config: SplitConfig) {
    await this.verifyProjectAccess(userId, projectId);

    if (!novelText || novelText.length < 100) {
      throw new BadRequestException('小说文本过短，至少需要 100 个字符');
    }

    let episodes: Array<{ number: number; title: string; content: string; estimatedDuration: number; wordCount: number }>;

    if (config.splitByChapter) {
      // 按章节分割
      episodes = this.splitByChapter(novelText, config.chapterPattern);
    } else {
      // 使用 AI 智能分割
      episodes = await this.splitByAI(userId, projectId, novelText, config);
    }

    return {
      data: {
        totalEpisodes: episodes.length,
        episodes,
        totalWords: novelText.length,
        averageWordsPerEpisode: Math.round(novelText.length / episodes.length),
      },
    };
  }

  /**
   * 执行分割并创建剧集
   */
  async executeSplit(userId: string, projectId: string, novelText: string, config: SplitConfig) {
    await this.verifyProjectAccess(userId, projectId);

    // Get preview first
    const preview = await this.previewSplit(userId, projectId, novelText, config);

    // Create episodes
    const createdEpisodes = [];
    for (const ep of preview.data.episodes) {
      const episode = await this.prisma.episode.create({
        data: {
          projectId,
          number: ep.number,
          title: ep.title,
          description: ep.content.substring(0, 200) + '...',
        },
      });
      createdEpisodes.push(episode);
    }

    this.logger.log(`Novel split completed: ${createdEpisodes.length} episodes created for project ${projectId}`);

    return {
      data: {
        totalEpisodes: createdEpisodes.length,
        episodes: createdEpisodes,
      },
    };
  }

  /**
   * 按章节分割
   */
  private splitByChapter(text: string, pattern?: string): Array<{ number: number; title: string; content: string; estimatedDuration: number; wordCount: number }> {
    // Default chapter patterns
    const defaultPatterns = [
      /^第[一二三四五六七八九十百千\d]+[章回节卷]/m,
      /^Chapter\s+\d+/mi,
      /^CHAPTER\s+\d+/m,
      /^\d+\.\s+/m,
    ];

    const regex = pattern ? new RegExp(pattern, 'gm') : defaultPatterns[0];
    const chapters: Array<{ number: number; title: string; content: string; estimatedDuration: number; wordCount: number }> = [];

    let lastIndex = 0;
    let match;
    let chapterNumber = 0;

    // Find all chapter starts
    const matches: Array<{ index: number; title: string }> = [];
    while ((match = regex.exec(text)) !== null) {
      matches.push({ index: match.index, title: match[0].trim() });
    }

    if (matches.length === 0) {
      // No chapters found, return whole text as one episode
      return [{
        number: 1,
        title: '全文',
        content: text,
        estimatedDuration: this.estimateDuration(text),
        wordCount: text.length,
      }];
    }

    // Split text by chapters
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const content = text.substring(start, end).trim();

      if (content.length > 0) {
        chapterNumber++;
        chapters.push({
          number: chapterNumber,
          title: matches[i].title || `第 ${chapterNumber} 章`,
          content,
          estimatedDuration: this.estimateDuration(content),
          wordCount: content.length,
        });
      }
    }

    return chapters;
  }

  /**
   * 使用 AI 智能分割
   */
  private async splitByAI(userId: string, projectId: string, text: string, config: SplitConfig): Promise<Array<{ number: number; title: string; content: string; estimatedDuration: number; wordCount: number }>> {
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');
    const llmAdapter = this.adapterFactory.getLLMAdapter(modelId);

    const targetEpisodes = config.targetEpisodes || this.calculateTargetEpisodes(text, config.targetDuration);

    const systemPrompt = `你是一个专业的剧本编辑。请将以下长篇小说/故事文本分割为 ${targetEpisodes} 集。

要求：
1. 每集应该是一个相对完整的故事段落
2. 在合适的情节转折点分割
3. 每集时长控制在 1-3 分钟（约 200-600 字）
4. 为每集生成简短标题

返回严格的 JSON 格式：
[
  {
    "number": 1,
    "title": "第一集标题",
    "content": "本集内容..."
  }
]

注意：content 字段必须包含完整的原文内容，不要修改或总结。`;

    try {
      const result = await llmAdapter.generateText(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请分割以下文本：\n\n${text.substring(0, 8000)}` },
          ],
          temperature: 0.3,
          maxTokens: 4000,
        },
        { apiKey, baseUrl }
      );

      const parsed = this.parseAIResult(result.content);
      return parsed.map((ep, index) => ({
        number: index + 1,
        title: ep.title || `第 ${index + 1} 集`,
        content: ep.content,
        estimatedDuration: this.estimateDuration(ep.content),
        wordCount: ep.content.length,
      }));
    } catch (error: any) {
      this.logger.error(`AI split failed: ${error.message}`);
      // Fallback to simple split
      return this.simpleSplit(text, targetEpisodes);
    }
  }

  /**
   * 简单分割（兜底）
   */
  private simpleSplit(text: string, targetEpisodes: number): Array<{ number: number; title: string; content: string; estimatedDuration: number; wordCount: number }> {
    const chunkSize = Math.ceil(text.length / targetEpisodes);
    const episodes: Array<{ number: number; title: string; content: string; estimatedDuration: number; wordCount: number }> = [];

    for (let i = 0; i < targetEpisodes; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, text.length);
      const content = text.substring(start, end);

      if (content.trim().length > 0) {
        episodes.push({
          number: i + 1,
          title: `第 ${i + 1} 集`,
          content: content.trim(),
          estimatedDuration: this.estimateDuration(content),
          wordCount: content.length,
        });
      }
    }

    return episodes;
  }

  /**
   * 计算目标集数
   */
  private calculateTargetEpisodes(text: string, targetDuration?: number): number {
    const wordsPerMinute = 200; // Average speaking speed
    const totalMinutes = text.length / wordsPerMinute;
    const episodeDuration = targetDuration ? targetDuration / 60 : 2; // Default 2 minutes per episode

    return Math.max(1, Math.ceil(totalMinutes / episodeDuration));
  }

  /**
   * 估算时长（秒）
   */
  private estimateDuration(text: string): number {
    const wordsPerMinute = 200;
    const minutes = text.length / wordsPerMinute;
    return Math.round(minutes * 60);
  }

  /**
   * 解析 AI 返回结果
   */
  private parseAIResult(content: string): Array<{ number: number; title: string; content: string }> {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/```\s*$/, '');
    }

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error: any) {
      this.logger.error(`Failed to parse AI result: ${error.message}`);
    }

    return [];
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
