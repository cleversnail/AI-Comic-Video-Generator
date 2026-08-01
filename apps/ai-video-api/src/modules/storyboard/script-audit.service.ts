import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';

export interface AuditResult {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D';
  summary: string;
  details: {
    structure: { score: number; feedback: string };
    dialogue: { score: number; feedback: string };
    pacing: { score: number; feedback: string };
    visual: { score: number; feedback: string };
    emotion: { score: number; feedback: string };
  };
  suggestions: string[];
}

@Injectable()
export class ScriptAuditService {
  private readonly logger = new Logger(ScriptAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  /**
   * 审计项目的剧本质量
   */
  async auditProject(userId: string, projectId: string): Promise<{ data: AuditResult }> {
    await this.verifyProjectAccess(userId, projectId);

    // Get project data
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
    });

    const characters = await this.prisma.character.findMany({
      where: { projectId },
    });

    const storyboards = await this.prisma.storyboard.findMany({
      where: { projectId },
      include: { shots: { orderBy: { sequence: 'asc' } } },
      orderBy: { sequence: 'asc' },
    });

    // Build script content for analysis
    const scriptContent = this.buildScriptContent(project, characters, storyboards);

    if (!scriptContent || scriptContent.length < 50) {
      return {
        data: {
          score: 0,
          grade: 'D',
          summary: '剧本内容不足，无法进行质量评估。请先添加故事和分镜。',
          details: {
            structure: { score: 0, feedback: '缺少故事结构' },
            dialogue: { score: 0, feedback: '缺少对话内容' },
            pacing: { score: 0, feedback: '缺少节奏设计' },
            visual: { score: 0, feedback: '缺少视觉描述' },
            emotion: { score: 0, feedback: '缺少情感表达' },
          },
          suggestions: ['请输入故事剧情', '添加角色设定', '生成分镜并添加台词'],
        },
      };
    }

    // Use LLM to analyze script quality
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');
    const llmAdapter = this.adapterFactory.getLLMAdapter(modelId);

    const systemPrompt = `你是一个专业的剧本质量评估专家。请从以下 5 个维度评估剧本质量，每个维度 0-20 分，总分 100 分：

1. **结构**（20分）：三幕结构是否完整、起承转合是否清晰
2. **对话**（20分）：台词是否自然、角色语言是否有区分度
3. **节奏**（20分）：分镜时长分配是否合理、是否有张有弛
4. **视觉**（20分）：画面描述是否具体、镜头语言是否丰富
5. **情感**（20分）：情绪表达是否到位、是否有感染力

请返回严格的 JSON 格式：
{
  "score": 总分,
  "grade": "A/B/C/D",
  "summary": "一句话总评",
  "details": {
    "structure": { "score": 分数, "feedback": "评价" },
    "dialogue": { "score": 分数, "feedback": "评价" },
    "pacing": { "score": 分数, "feedback": "评价" },
    "visual": { "score": 分数, "feedback": "评价" },
    "emotion": { "score": 分数, "feedback": "评价" }
  },
  "suggestions": ["建议1", "建议2", "建议3"]
}`;

    try {
      const result = await llmAdapter.generateText(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请评估以下剧本：\n\n${scriptContent}` },
          ],
          temperature: 0.3,
          maxTokens: 2000,
        },
        { apiKey, baseUrl }
      );

      const auditResult = this.parseAuditResult(result.content);
      return { data: auditResult };
    } catch (error: any) {
      this.logger.error(`Script audit failed: ${error.message}`);
      throw new BadRequestException(`剧本审计失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 构建剧本内容用于分析
   */
  private buildScriptContent(project: any, characters: any[], storyboards: any[]): string {
    const parts: string[] = [];

    // Project info
    parts.push(`项目：${project.name}`);
    if (project.description) parts.push(`简介：${project.description}`);
    if (project.style) parts.push(`风格：${project.style}`);

    // Characters
    if (characters.length > 0) {
      parts.push('\n【角色设定】');
      characters.forEach((c, i) => {
        const charParts = [`${i + 1}. ${c.name}`];
        if (c.gender) charParts.push(`性别：${c.gender}`);
        if (c.age) charParts.push(`年龄：${c.age}`);
        if (c.personality) charParts.push(`性格：${c.personality}`);
        if (c.appearance) charParts.push(`外貌：${c.appearance}`);
        parts.push(charParts.join('，'));
      });
    }

    // Storyboards and shots
    if (storyboards.length > 0) {
      parts.push('\n【分镜剧本】');
      storyboards.forEach((sb, sbIndex) => {
        parts.push(`\n--- 分镜 ${sbIndex + 1} ---`);
        if (sb.description) parts.push(`描述：${sb.description}`);
        if (sb.scene) parts.push(`场景：${sb.scene}`);
        if (sb.emotion) parts.push(`情绪：${sb.emotion}`);

        sb.shots?.forEach((shot: any, shotIndex: number) => {
          const params = shot.params || {};
          parts.push(`\n镜头 ${shotIndex + 1}：`);
          if (params.title) parts.push(`  标题：${params.title}`);
          if (params.description) parts.push(`  画面：${params.description}`);
          if (shot.prompt) parts.push(`  提示词：${shot.prompt}`);
          if (params.dialogue) parts.push(`  台词：「${params.dialogue}」`);
          if (params.narration) parts.push(`  旁白：${params.narration}`);
          if (params.subtitle) parts.push(`  字幕：${params.subtitle}`);
          if (params.emotion) parts.push(`  情绪：${params.emotion}`);
        });
      });
    }

    return parts.join('\n');
  }

  /**
   * 解析 LLM 返回的审计结果
   */
  private parseAuditResult(content: string): AuditResult {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/```\s*$/, '');
    }

    try {
      const parsed = JSON.parse(cleaned);

      // Validate and normalize
      const score = Math.min(100, Math.max(0, parsed.score || 0));
      const grade = this.calculateGrade(score);

      return {
        score,
        grade: parsed.grade || grade,
        summary: parsed.summary || '暂无总评',
        details: {
          structure: this.normalizeDetail(parsed.details?.structure),
          dialogue: this.normalizeDetail(parsed.details?.dialogue),
          pacing: this.normalizeDetail(parsed.details?.pacing),
          visual: this.normalizeDetail(parsed.details?.visual),
          emotion: this.normalizeDetail(parsed.details?.emotion),
        },
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
      };
    } catch (error: any) {
      this.logger.error(`Failed to parse audit result: ${error.message}`);
      // Return a default result if parsing fails
      return {
        score: 50,
        grade: 'C',
        summary: '剧本质量评估完成，建议进一步优化',
        details: {
          structure: { score: 10, feedback: '建议完善故事结构' },
          dialogue: { score: 10, feedback: '建议优化角色台词' },
          pacing: { score: 10, feedback: '建议调整分镜节奏' },
          visual: { score: 10, feedback: '建议丰富画面描述' },
          emotion: { score: 10, feedback: '建议加强情感表达' },
        },
        suggestions: ['建议完善故事结构', '建议优化角色台词', '建议丰富画面描述'],
      };
    }
  }

  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  }

  private normalizeDetail(detail: any): { score: number; feedback: string } {
    return {
      score: Math.min(20, Math.max(0, detail?.score || 0)),
      feedback: detail?.feedback || '暂无评价',
    };
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');
  }
}
