import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CostRecord {
  modelId: string;
  capability: string;
  tokens?: number;
  duration?: number;
  imageCount?: number;
  cost: number;
}

@Injectable()
export class CostService {
  private readonly logger = new Logger(CostService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录 API 调用成本
   */
  async recordCost(userId: string, apiKeyId: string, record: CostRecord) {
    try {
      await this.prisma.userApiKey.update({
        where: { id: apiKeyId },
        data: {
          totalCalls: { increment: 1 },
          estimatedCost: { increment: record.cost },
        },
      });

      this.logger.log(`Cost recorded: ${record.capability} - $${record.cost.toFixed(4)}`);
    } catch (error: any) {
      this.logger.error(`Failed to record cost: ${error.message}`);
    }
  }

  /**
   * 获取用户成本统计
   */
  async getUserCostSummary(userId: string) {
    const apiKeys = await this.prisma.userApiKey.findMany({
      where: { userId },
      include: { model: true },
    });

    const byCapability: Record<string, { calls: number; cost: number }> = {};
    let totalCalls = 0;
    let totalCost = 0;

    for (const key of apiKeys) {
      const cap = key.model.capability;
      if (!byCapability[cap]) {
        byCapability[cap] = { calls: 0, cost: 0 };
      }
      byCapability[cap].calls += key.totalCalls;
      byCapability[cap].cost += key.estimatedCost;
      totalCalls += key.totalCalls;
      totalCost += key.estimatedCost;
    }

    return {
      data: {
        totalCalls,
        totalCost: Math.round(totalCost * 100) / 100,
        byCapability: Object.entries(byCapability).map(([capability, stats]) => ({
          capability,
          calls: stats.calls,
          cost: Math.round(stats.cost * 100) / 100,
        })),
        keys: apiKeys.map((key) => ({
          id: key.id,
          modelId: key.modelId,
          modelName: key.model.name,
          capability: key.model.capability,
          alias: key.alias,
          totalCalls: key.totalCalls,
          estimatedCost: Math.round(key.estimatedCost * 100) / 100,
        })),
      },
    };
  }

  /**
   * 获取项目成本统计
   */
  async getProjectCostSummary(userId: string, projectId: string) {
    // Verify project access
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    // Get generation tasks for this project
    const tasks = await this.prisma.generationTask.findMany({
      where: { projectId },
    });

    const byCapability: Record<string, { count: number; cost: number }> = {};
    let totalCost = 0;

    for (const task of tasks) {
      const cap = task.capability;
      if (!byCapability[cap]) {
        byCapability[cap] = { count: 0, cost: 0 };
      }
      byCapability[cap].count += 1;

      // Estimate cost based on model and capability
      const estimatedCost = this.estimateTaskCost(task);
      byCapability[cap].cost += estimatedCost;
      totalCost += estimatedCost;
    }

    return {
      data: {
        projectId,
        totalTasks: tasks.length,
        totalCost: Math.round(totalCost * 100) / 100,
        byCapability: Object.entries(byCapability).map(([capability, stats]) => ({
          capability,
          count: stats.count,
          cost: Math.round(stats.cost * 100) / 100,
        })),
      },
    };
  }

  private estimateTaskCost(task: any): number {
    // Use model billing rule if available, otherwise fallback to defaults
    const billingRule = task.parameters?.billingRule;
    if (billingRule?.unitPrice) {
      return billingRule.unitPrice;
    }

    // Default cost estimation based on capability (in CNY)
    switch (task.capability) {
      case 'llm': return 0.07;   // ~¥0.07 per LLM call
      case 'image': return 0.15;  // ~¥0.15 per image
      case 'video': return 0.70;  // ~¥0.70 per video
      case 'tts': return 0.03;   // ~¥0.03 per TTS
      default: return 0;
    }
  }
}
