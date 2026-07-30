import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentOrchestratorService, AgentRole } from './agent-orchestrator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('多 Agent 编排')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/agents')
export class AgentsController {
  constructor(private readonly orchestratorService: AgentOrchestratorService) {}

  @Get('workflows')
  @ApiOperation({ summary: '获取可用工作流列表' })
  async getWorkflows() {
    return this.orchestratorService.getWorkflows();
  }

  @Get('workflows/:workflowId')
  @ApiOperation({ summary: '获取工作流详情' })
  async getWorkflow(@Param('workflowId') workflowId: string) {
    return this.orchestratorService.getWorkflow(workflowId);
  }

  @Post('workflows/:workflowId/execute')
  @ApiOperation({ summary: '执行工作流' })
  async executeWorkflow(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('workflowId') workflowId: string,
    @Body() body: { inputs: Record<string, string> },
  ) {
    return this.orchestratorService.executeWorkflow(userId, projectId, workflowId, body.inputs);
  }

  @Post('execute')
  @ApiOperation({ summary: '执行单个 Agent 任务' })
  async executeAgent(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() body: { role: AgentRole; input: string; context?: Record<string, any> },
  ) {
    return this.orchestratorService.executeAgentTask(userId, projectId, body.role, body.input, body.context);
  }
}
