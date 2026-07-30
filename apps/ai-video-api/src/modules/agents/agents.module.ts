import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [PrismaModule, ModelsModule],
  controllers: [AgentsController],
  providers: [AgentOrchestratorService],
  exports: [AgentOrchestratorService],
})
export class AgentsModule {}
