import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { ModelsService } from '../models/models.service';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';

export interface ParsedScript {
  title: string;
  characters: Array<{ name: string; description: string }>;
  scenes: Array<{
    sceneNumber: number;
    location: string;
    time: string;
    description: string;
    dialogues: Array<{ character: string; line: string; action?: string }>;
  }>;
  episodes?: Array<{ number: number; title: string; content: string }>;
}

@Injectable()
export class ScriptImportService {
  private readonly logger = new Logger(ScriptImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactory,
    private readonly modelsService: ModelsService,
  ) {}

  /**
   * 从纯文本解析剧本
   */
  async parseFromText(userId: string, projectId: string, text: string): Promise<{ data: ParsedScript }> {
    if (!text || text.trim().length < 10) {
      throw new BadRequestException('剧本内容过短，至少需要 10 个字符');
    }

    this.logger.log(`Parsing script text: ${text.length} chars`);

    // Use LLM to parse the script into structured format
    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');
    const llmAdapter = this.adapterFactory.getLLMAdapter(modelId);

    const systemPrompt = `你是一个专业的剧本解析器。请将用户输入的文本解析为结构化的剧本格式。

输出严格的 JSON 格式（不要有 markdown 代码块标记）：
{
  "title": "剧本标题",
  "characters": [
    {"name": "角色名", "description": "角色描述"}
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "location": "场景地点",
      "time": "时间（如：白天/夜晚）",
      "description": "场景描述",
      "dialogues": [
        {"character": "角色名", "line": "台词", "action": "动作描述（如有）"}
      ]
    }
  ]
}

规则：
1. 如果文本包含多个章节/集，将 episodes 字段填入
2. 自动识别角色名（对话前的名称）
3. 场景切换通过场景描写或时间/地点变化判断
4. 如果文本没有明确场景划分，按段落自动拆分
5. 保持原文的剧情完整性`;

    const result = await llmAdapter.generateText(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请解析以下剧本：\n\n${text}` },
        ],
        temperature: 0.3,
        maxTokens: 8000,
      },
      { apiKey, baseUrl }
    );

    let parsed: ParsedScript;
    try {
      let content = result.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\n?/, '').replace(/```\s*$/, '');
      }
      parsed = JSON.parse(content);
    } catch (error: any) {
      this.logger.error(`Failed to parse script: ${error.message}`);
      throw new BadRequestException('AI 解析剧本失败，请检查文本格式');
    }

    return { data: parsed };
  }

  /**
   * 从 DOCX 文件解析
   */
  async parseFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error: any) {
      throw new BadRequestException(`DOCX 解析失败: ${error.message}`);
    }
  }

  /**
   * 从 PDF 文件解析
   */
  async parseFromPdf(buffer: Buffer): Promise<string> {
    try {
      const result = await pdfParse(buffer);
      return result.text;
    } catch (error: any) {
      throw new BadRequestException(`PDF 解析失败: ${error.message}`);
    }
  }

  /**
   * 从上传文件解析剧本
   */
  async parseFromFile(userId: string, projectId: string, file: Express.Multer.File): Promise<{ data: ParsedScript }> {
    if (!file) throw new BadRequestException('请上传文件');

    let text: string;
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'txt':
        text = file.buffer.toString('utf-8');
        break;
      case 'docx':
        text = await this.parseFromDocx(file.buffer);
        break;
      case 'pdf':
        text = await this.parseFromPdf(file.buffer);
        break;
      default:
        throw new BadRequestException('不支持的文件格式，请上传 TXT/DOCX/PDF');
    }

    return this.parseFromText(userId, projectId, text);
  }

  /**
   * 将解析后的剧本写入项目（生成分镜）
   */
  async importToProject(userId: string, projectId: string, parsed: ParsedScript) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new BadRequestException('项目不存在');

    // Create characters from parsed script
    for (const char of parsed.characters) {
      const existing = await this.prisma.character.findFirst({
        where: { projectId, name: char.name },
      });
      if (!existing) {
        await this.prisma.character.create({
          data: {
            projectId,
            name: char.name,
            personality: char.description,
          },
        });
      }
    }

    // Find or create storyboard (fix: storyboard.id is UUID, not projectId)
    let storyboard = await this.prisma.storyboard.findFirst({ where: { projectId } });
    if (!storyboard) {
      storyboard = await this.prisma.storyboard.create({
        data: { projectId, sequence: 1, description: '从剧本导入' },
      });
    }

    // Archive old shots instead of hard-deleting (preserve version history)
    const oldShots = await this.prisma.shot.findMany({ where: { projectId } });
    for (const oldShot of oldShots) {
      const oldParams = (oldShot.params as any) || {};
      await this.prisma.shot.update({
        where: { id: oldShot.id },
        data: { params: { ...oldParams, archived: true, archivedAt: new Date().toISOString() } } },
      });
    }

    // Create shots from scenes
    const shots = [];
    for (let i = 0; i < parsed.scenes.length; i++) {
      const scene = parsed.scenes[i];
      const dialogueText = scene.dialogues.map((d) => `${d.character}：${d.line}`).join('\n');
      const prompt = `${scene.description}${dialogueText ? '\n对话：' + dialogueText : ''}`;

      const shot = await this.prisma.shot.create({
        data: {
          projectId,
          storyboardId: storyboard.id,
          sequence: i + 1,
          prompt,
          params: {
            location: scene.location,
            time: scene.time,
            description: scene.description,
            dialogues: scene.dialogues,
            sceneNumber: scene.sceneNumber,
          },
          status: 'draft',
          duration: 3000,
        },
      });
      shots.push(shot);
    }

    return {
      data: {
        title: parsed.title,
        characterCount: parsed.characters.length,
        sceneCount: parsed.scenes.length,
        shots,
      },
    };
  }
}
