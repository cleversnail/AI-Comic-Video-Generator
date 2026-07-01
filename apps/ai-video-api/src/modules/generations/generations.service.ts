import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { ModelsService } from '../models/models.service';
import { CreateGenerationDto } from './dto/create-generation.dto';

@Injectable()
export class GenerationsService {
  private readonly logger = new Logger(GenerationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly modelsService: ModelsService,
  ) {}

  async createTask(userId: string, projectId: string, dto: CreateGenerationDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException('项目不存在');

    // Resolve API Key
    const { apiKey, apiKeyId } = await this.resolveKeyInfo(userId, projectId, dto.capability, dto.modelId);

    // Create GenerationTask in DB
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        shotId: dto.shotId || null,
        capability: dto.capability,
        modelId: dto.modelId,
        apiKeyId,
        parameters: dto.parameters || {},
        status: 'queued',
      },
    });

    // Add to BullMQ queue
    await this.queueService.addGenerationJob({
      taskId: task.id,
      projectId,
      shotId: dto.shotId,
      capability: dto.capability as any,
      modelId: dto.modelId,
      apiKeyId,
      input: dto.parameters || {},
    });

    return { data: task };
  }

  async listTasks(userId: string, projectId: string) {
    const tasks = await this.prisma.generationTask.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: tasks };
  }

  async getTask(userId: string, projectId: string, taskId: string) {
    const task = await this.prisma.generationTask.findFirst({
      where: { id: taskId, projectId },
    });
    if (!task) throw new NotFoundException('任务不存在');
    return { data: task };
  }

  private async resolveKeyInfo(userId: string, projectId: string, capability: string, modelId: string) {
    const allKeys = await this.prisma.userApiKey.findMany({
      where: { userId, modelId, status: 'valid' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    const key = allKeys[0];
    if (!key) throw new NotFoundException(`未找到模型 ${modelId} 的有效 API Key`);

    const apiKey = await this.modelsService.getDecryptedApiKey(userId, key.id);
    return { apiKey, apiKeyId: key.id };
  }
}
