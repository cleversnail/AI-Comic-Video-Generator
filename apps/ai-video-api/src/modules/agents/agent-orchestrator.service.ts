import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import { AdapterFactory } from '../../common/adapters/adapter.factory';

export enum AgentRole {
  WRITER = 'writer',
  STORYBOARD_ARTIST = 'storyboard_artist',
  DIRECTOR = 'director',
  CHARACTER_DESIGNER = 'character_designer',
  REVIEWER = 'reviewer',
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentRole: AgentRole;
  inputTemplate: string;
  outputKey: string;
  dependencies?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowResult {
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  steps: Array<{
    stepId: string;
    agentRole: AgentRole;
    status: string;
    output?: string;
    error?: string;
  }>;
  finalOutput?: Record<string, any>;
}

const WORKFLOWS: Workflow[] = [
  {
    id: 'story-to-storyboard',
    name: '故事转分镜',
    description: '将故事文本自动拆分为专业分镜',
    steps: [
      {
        id: 'analyze-story',
        name: '分析故事结构',
        agentRole: AgentRole.WRITER,
        inputTemplate: '请分析以下故事的结构，识别主要情节转折点：\n\n{{story}}',
        outputKey: 'storyAnalysis',
      },
      {
        id: 'design-characters',
        name: '设计角色设定',
        agentRole: AgentRole.CHARACTER_DESIGNER,
        inputTemplate: '根据以下故事和分析，设计角色设定：\n\n故事：{{story}}\n分析：{{storyAnalysis}}',
        outputKey: 'characterDesigns',
        dependencies: ['analyze-story'],
      },
      {
        id: 'create-storyboard',
        name: '创建分镜',
        agentRole: AgentRole.STORYBOARD_ARTIST,
        inputTemplate: '根据以下信息创建分镜：\n\n故事：{{story}}\n分析：{{storyAnalysis}}\n角色：{{characterDesigns}}',
        outputKey: 'storyboard',
        dependencies: ['analyze-story', 'design-characters'],
      },
      {
        id: 'review-storyboard',
        name: '审核分镜',
        agentRole: AgentRole.REVIEWER,
        inputTemplate: '请审核以下分镜的质量：\n\n{{storyboard}}',
        outputKey: 'review',
        dependencies: ['create-storyboard'],
      },
    ],
  },
  {
    id: 'optimize-dialogue',
    name: '优化台词',
    description: '优化角色台词，使其更自然生动',
    steps: [
      {
        id: 'analyze-dialogue',
        name: '分析现有台词',
        agentRole: AgentRole.WRITER,
        inputTemplate: '请分析以下台词的优缺点：\n\n{{dialogue}}',
        outputKey: 'dialogueAnalysis',
      },
      {
        id: 'optimize',
        name: '优化台词',
        agentRole: AgentRole.WRITER,
        inputTemplate: '根据分析优化台词：\n\n原台词：{{dialogue}}\n分析：{{dialogueAnalysis}}',
        outputKey: 'optimizedDialogue',
        dependencies: ['analyze-dialogue'],
      },
      {
        id: 'review',
        name: '审核优化结果',
        agentRole: AgentRole.REVIEWER,
        inputTemplate: '请审核优化后的台词：\n\n{{optimizedDialogue}}',
        outputKey: 'review',
        dependencies: ['optimize'],
      },
    ],
  },
  {
    id: 'enhance-storyboard',
    name: '增强分镜',
    description: '优化分镜的镜头语言和视觉效果',
    steps: [
      {
        id: 'analyze-shots',
        name: '分析现有分镜',
        agentRole: AgentRole.DIRECTOR,
        inputTemplate: '请分析以下分镜的镜头语言：\n\n{{shots}}',
        outputKey: 'shotAnalysis',
      },
      {
        id: 'enhance',
        name: '增强分镜',
        agentRole: AgentRole.STORYBOARD_ARTIST,
        inputTemplate: '根据导演意见增强分镜：\n\n原分镜：{{shots}}\n分析：{{shotAnalysis}}',
        outputKey: 'enhancedShots',
        dependencies: ['analyze-shots'],
      },
    ],
  },
];

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsService: ModelsService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  getWorkflows() {
    return {
      data: WORKFLOWS.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        stepCount: w.steps.length,
      })),
    };
  }

  getWorkflow(workflowId: string) {
    const workflow = WORKFLOWS.find((w) => w.id === workflowId);
    if (!workflow) throw new Error('工作流不存在');
    return { data: workflow };
  }

  async executeWorkflow(
    userId: string,
    projectId: string,
    workflowId: string,
    inputs: Record<string, string>,
  ): Promise<WorkflowResult> {
    await this.verifyProjectAccess(userId, projectId);

    const workflow = WORKFLOWS.find((w) => w.id === workflowId);
    if (!workflow) throw new Error('工作流不存在');

    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');
    const llmAdapter = this.adapterFactory.getLLMAdapter(modelId);

    const result: WorkflowResult = {
      workflowId,
      status: 'running',
      steps: [],
    };

    const stepOutputs: Record<string, string> = { ...inputs };

    for (const step of workflow.steps) {
      this.logger.log(`Executing step: ${step.name} (${step.agentRole})`);

      const stepResult = {
        stepId: step.id,
        agentRole: step.agentRole,
        status: 'running' as string,
        output: undefined as string | undefined,
        error: undefined as string | undefined,
      };

      try {
        let input = step.inputTemplate;
        for (const [key, value] of Object.entries(stepOutputs)) {
          input = input.replace(`{{${key}}}`, value);
        }

        const systemPrompt = this.getAgentSystemPrompt(step.agentRole);

        const llmResult = await llmAdapter.generateText(
          {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: input },
            ],
            temperature: 0.7,
            maxTokens: 4000,
          },
          { apiKey, baseUrl }
        );

        stepResult.output = llmResult.content;
        stepResult.status = 'completed';
        stepOutputs[step.outputKey] = llmResult.content;

        this.logger.log(`Step completed: ${step.name}`);
      } catch (error: any) {
        this.logger.error(`Step failed: ${step.name} - ${error.message}`);
        stepResult.status = 'failed';
        stepResult.error = error.message;
        result.status = 'failed';
      }

      result.steps.push(stepResult);
      if (result.status === 'failed') break;
    }

    if (result.status === 'running') {
      result.status = 'completed';
      result.finalOutput = stepOutputs;
    }

    return result;
  }

  async executeAgentTask(
    userId: string,
    projectId: string,
    role: AgentRole,
    input: string,
    context?: Record<string, any>,
  ): Promise<{ output: string }> {
    await this.verifyProjectAccess(userId, projectId);

    const { apiKey, modelId, baseUrl } = await this.modelsService.resolveApiKey(userId, projectId, 'llm');
    const llmAdapter = this.adapterFactory.getLLMAdapter(modelId);

    const systemPrompt = this.getAgentSystemPrompt(role);

    let fullInput = input;
    if (context) {
      fullInput += '\n\n上下文信息：\n' + Object.entries(context).map(([k, v]) => `${k}: ${v}`).join('\n');
    }

    const result = await llmAdapter.generateText(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullInput },
        ],
        temperature: 0.7,
        maxTokens: 4000,
      },
      { apiKey, baseUrl }
    );

    return { output: result.content };
  }

  private getAgentSystemPrompt(role: AgentRole): string {
    const prompts: Record<AgentRole, string> = {
      [AgentRole.WRITER]: `你是一个专业的编剧和故事创作者。你的职责是：
1. 创作引人入胜的故事和剧情
2. 优化角色台词，使其自然生动
3. 分析故事结构，识别情节转折点
4. 确保故事逻辑连贯、节奏合理

请用专业但易懂的语言回答，给出具体的建议和示例。`,

      [AgentRole.STORYBOARD_ARTIST]: `你是一个专业的分镜师。你的职责是：
1. 将故事拆分为合适的分镜
2. 设计每个分镜的镜头语言（景别、角度、运镜）
3. 确保分镜之间的连贯性和节奏感
4. 为每个分镜生成适合 AI 生成的提示词

请返回结构化的分镜方案，包含标题、描述、镜头参数、提示词。`,

      [AgentRole.DIRECTOR]: `你是一个专业的导演。你的职责是：
1. 把控整体节奏和情绪走向
2. 调整镜头语言以增强表现力
3. 确保视觉风格的一致性
4. 提出具体的改进建议

请从导演的专业角度给出分析和建议。`,

      [AgentRole.CHARACTER_DESIGNER]: `你是一个专业的角色设计师。你的职责是：
1. 设计角色的外貌、性格、背景
2. 确保角色形象的一致性
3. 为角色创建详细的视觉描述
4. 考虑角色在不同场景中的表现

请提供详细的角色设定，包括外貌、服装、性格特点。`,

      [AgentRole.REVIEWER]: `你是一个专业的审稿人和质量控制专家。你的职责是：
1. 审核内容的质量和完整性
2. 发现潜在的问题和改进点
3. 提供具体的修改建议
4. 确保内容符合专业标准

请从多个维度进行审核，给出评分和详细反馈。`,
    };

    return prompts[role] || prompts[AgentRole.WRITER];
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new Error('项目不存在');
  }
}
