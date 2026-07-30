"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { agentsApi, WorkflowSummary, WorkflowResult, AgentRole } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface AgentPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

const agentRoles: Array<{ value: AgentRole; label: string; icon: string; desc: string }> = [
  { value: 'writer', label: '编剧', icon: '✍️', desc: '创作故事、优化台词' },
  { value: 'storyboard_artist', label: '分镜师', icon: '🎬', desc: '拆分分镜、设计镜头' },
  { value: 'director', label: '导演', icon: '🎥', desc: '把控节奏、调整情绪' },
  { value: 'character_designer', label: '角色设计师', icon: '👤', desc: '角色设定、形象设计' },
  { value: 'reviewer', label: '审稿人', icon: '📝', desc: '质量审核、提出建议' },
];

export function AgentPanel({ projectId, isOpen, onClose }: AgentPanelProps) {
  const toast = useToast();
  const [activeMode, setActiveMode] = useState<'workflow' | 'single'>('workflow');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, string>>({});
  const [singleRole, setSingleRole] = useState<AgentRole>('writer');
  const [singleInput, setSingleInput] = useState('');
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [singleResult, setSingleResult] = useState<string | null>(null);

  const { data: workflows = [] } = useQuery({
    queryKey: ['agentWorkflows', projectId],
    queryFn: () => agentsApi.getWorkflows(projectId),
    enabled: isOpen,
  });

  const { data: workflowDetail } = useQuery({
    queryKey: ['agentWorkflow', projectId, selectedWorkflow],
    queryFn: () => agentsApi.getWorkflow(projectId, selectedWorkflow!),
    enabled: !!selectedWorkflow,
  });

  const executeWorkflowMutation = useMutation({
    mutationFn: () => agentsApi.executeWorkflow(projectId, selectedWorkflow!, workflowInputs),
    onSuccess: (data) => {
      setResult(data);
      toast.success('工作流执行完成');
    },
    onError: (error: any) => {
      toast.error('执行失败', error?.response?.data?.message || error?.message);
    },
  });

  const executeSingleMutation = useMutation({
    mutationFn: () => agentsApi.executeAgent(projectId, { role: singleRole, input: singleInput }),
    onSuccess: (data) => {
      setSingleResult(data.output);
      toast.success('Agent 执行完成');
    },
    onError: (error: any) => {
      toast.error('执行失败', error?.response?.data?.message || error?.message);
    },
  });

  const handleExecuteWorkflow = () => {
    if (!selectedWorkflow) {
      toast.warning('请先选择工作流');
      return;
    }
    executeWorkflowMutation.mutate();
  };

  const handleExecuteSingle = () => {
    if (!singleInput.trim()) {
      toast.warning('请输入任务内容');
      return;
    }
    executeSingleMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl max-h-[85vh] bg-panel-deep border border-divider rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-divider">
            <div>
              <h3 className="font-display text-lg font-bold text-white">多 Agent 编排</h3>
              <p className="text-xs text-text-secondary">多个 AI Agent 协作完成复杂任务</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-divider">
                <button
                  onClick={() => setActiveMode('workflow')}
                  className={`px-4 py-2 text-sm ${activeMode === 'workflow' ? 'bg-anime-purple text-white' : 'bg-panel-mid text-text-secondary'}`}
                >
                  工作流
                </button>
                <button
                  onClick={() => setActiveMode('single')}
                  className={`px-4 py-2 text-sm ${activeMode === 'single' ? 'bg-anime-purple text-white' : 'bg-panel-mid text-text-secondary'}`}
                >
                  单 Agent
                </button>
              </div>
              <button onClick={onClose} className="text-text-secondary hover:text-white ml-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeMode === 'workflow' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Workflow Selection */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-secondary">选择工作流</h4>
                  <div className="space-y-2">
                    {workflows.map((wf) => (
                      <div
                        key={wf.id}
                        onClick={() => setSelectedWorkflow(wf.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedWorkflow === wf.id
                            ? 'border-anime-purple bg-anime-purple/10'
                            : 'border-divider bg-panel-mid hover:border-anime-purple/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-medium text-white">{wf.name}</h5>
                          <span className="text-xs text-text-disabled">{wf.stepCount} 步</span>
                        </div>
                        <p className="text-xs text-text-secondary">{wf.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Workflow Inputs */}
                  {workflowDetail && workflowDetail.steps.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-text-secondary">输入参数</h4>
                      {workflowDetail.steps
                        .filter((step) => !step.dependencies || step.dependencies.length === 0)
                        .map((step) => (
                          <div key={step.id}>
                            <label className="block text-xs text-text-secondary mb-1">{step.name}</label>
                            <Textarea
                              value={workflowInputs[step.outputKey] || ''}
                              onChange={(e) => setWorkflowInputs({ ...workflowInputs, [step.outputKey]: e.target.value })}
                              placeholder={`输入${step.name}内容...`}
                              className="min-h-[80px]"
                            />
                          </div>
                        ))}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleExecuteWorkflow}
                    isLoading={executeWorkflowMutation.isPending}
                    disabled={!selectedWorkflow}
                  >
                    {executeWorkflowMutation.isPending ? '执行中...' : '执行工作流'}
                  </Button>
                </div>

                {/* Right: Result */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-secondary">执行结果</h4>

                  {executeWorkflowMutation.isPending && (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 rounded-full border-4 border-anime-purple border-t-transparent animate-spin mx-auto mb-4" />
                      <p className="text-text-secondary">Agent 正在协作中...</p>
                      <p className="text-xs text-text-disabled mt-1">这可能需要 30-60 秒</p>
                    </div>
                  )}

                  {result && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className={`p-3 rounded-lg ${result.status === 'completed' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <p className={`text-sm font-medium ${result.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                          {result.status === 'completed' ? '✅ 工作流执行完成' : '❌ 工作流执行失败'}
                        </p>
                      </div>

                      {result.steps.map((step, index) => (
                        <div key={step.stepId} className="p-3 rounded-lg bg-panel-mid border border-divider">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{agentRoles.find((r) => r.value === step.agentRole)?.icon}</span>
                              <span className="text-sm font-medium text-white">
                                {agentRoles.find((r) => r.value === step.agentRole)?.label}
                              </span>
                            </div>
                            <span className={`text-xs ${step.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                              {step.status === 'completed' ? '✓' : '✕'}
                            </span>
                          </div>
                          {step.output && (
                            <p className="text-xs text-text-secondary whitespace-pre-wrap line-clamp-6">
                              {step.output}
                            </p>
                          )}
                          {step.error && (
                            <p className="text-xs text-red-400">{step.error}</p>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {!result && !executeWorkflowMutation.isPending && (
                    <div className="text-center py-20">
                      <p className="text-text-secondary">选择工作流并执行</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Single Agent Mode */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-secondary">选择 Agent 角色</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {agentRoles.map((role) => (
                      <button
                        key={role.value}
                        onClick={() => setSingleRole(role.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          singleRole === role.value
                            ? 'border-anime-purple bg-anime-purple/10'
                            : 'border-divider bg-panel-mid hover:border-anime-purple/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span>{role.icon}</span>
                          <span className="text-sm font-medium text-white">{role.label}</span>
                        </div>
                        <p className="text-[10px] text-text-secondary">{role.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-1">任务内容</label>
                    <Textarea
                      value={singleInput}
                      onChange={(e) => setSingleInput(e.target.value)}
                      placeholder="描述你需要 Agent 完成的任务..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleExecuteSingle}
                    isLoading={executeSingleMutation.isPending}
                    disabled={!singleInput.trim()}
                  >
                    {executeSingleMutation.isPending ? '执行中...' : '执行任务'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-secondary">执行结果</h4>

                  {executeSingleMutation.isPending && (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 rounded-full border-4 border-anime-purple border-t-transparent animate-spin mx-auto mb-4" />
                      <p className="text-text-secondary">Agent 正在思考...</p>
                    </div>
                  )}

                  {singleResult && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-xl bg-panel-mid border border-divider"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span>{agentRoles.find((r) => r.value === singleRole)?.icon}</span>
                        <span className="text-sm font-medium text-white">
                          {agentRoles.find((r) => r.value === singleRole)?.label}的回答
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{singleResult}</p>
                    </motion.div>
                  )}

                  {!singleResult && !executeSingleMutation.isPending && (
                    <div className="text-center py-20">
                      <p className="text-text-secondary">选择角色并输入任务</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
