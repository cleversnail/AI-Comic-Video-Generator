"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/navigation/back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WandIcon, PlayIcon, RefreshCwIcon, FilmIcon } from "@/components/icons";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-states";
import { storyboardApi, generationsApi, modelsApi, GenerationTask } from "@/lib/api";
import { useTaskProgress, TaskProgress } from "@/lib/websocket";

import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/error";

export default function GeneratePage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const toast = useToast();

  // WebSocket 任务进度监听
  const handleTaskProgress = useCallback((data: TaskProgress) => {
    console.log('Task progress received:', data);
    // 可以在这里添加 toast 通知
  }, []);

  useTaskProgress(projectId, handleTaskProgress);

  // 获取分镜列表
  const { data: storyboard, isLoading: storyboardLoading, error: storyboardError } = useQuery({
    queryKey: ["storyboard", projectId],
    queryFn: () => storyboardApi.getStoryboard(projectId),
  });

  // 获取生成任务列表（WebSocket 会自动刷新，这里作为初始加载）
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ["generation-tasks", projectId],
    queryFn: () => generationsApi.listTasks(projectId),
    // 移除 refetchInterval，使用 WebSocket 实时更新
  });

  // 获取可用的视频模型
  const { data: videoModels = [], error: modelsError } = useQuery({
    queryKey: ["models", "video"],
    queryFn: () => modelsApi.listModels("video"),
  });

  // 获取用户的 API Keys
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => modelsApi.listMyApiKeys(),
  });

  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedModelVariant, setSelectedModelVariant] = useState<string>("");
  const [duration, setDuration] = useState(3);
  const [resolution, setResolution] = useState("1080p");
  const [previewVideo, setPreviewVideo] = useState<{ url: string; shotId: string } | null>(null);

  // 获取用户已配置的视频模型列表
  const configuredVideoKeys = apiKeys.filter((k: { capability?: string }) => k.capability === "video");
  const configuredVideoModels = videoModels.filter((m: { id: string }) =>
    configuredVideoKeys.some((k: { modelId: string }) => k.modelId === m.id)
  );

  // 获取当前选中模型的别名（用户配置的模型名称）
  const selectedModelAlias = configuredVideoKeys.find((k: { modelId: string }) => k.modelId === selectedModel)?.alias || "";

  // 获取实际使用的模型名称（使用用户配置的别名）
  const getActualModelId = () => {
    if (selectedModelAlias) return selectedModelAlias;
    if (selectedModelVariant) return selectedModelVariant;
    return selectedModel;
  };

  // 设置默认模型 - 优先使用用户已配置的视频模型
  useEffect(() => {
    if (configuredVideoModels.length === 0 || selectedModel) return;

    // 使用第一个已配置的视频模型
    setSelectedModel(configuredVideoModels[0].id);
  }, [configuredVideoModels, selectedModel]);

  // 当选中模型变化时，设置默认模型变体
  useEffect(() => {
    if (selectedModelAlias && !selectedModelVariant) {
      setSelectedModelVariant(selectedModelAlias);
    }
  }, [selectedModelAlias, selectedModelVariant]);

  // 创建生成任务的 mutation
  const createTaskMutation = useMutation({
    mutationFn: (shotId: string) =>
      generationsApi.createTask(projectId, {
        capability: "video",
        modelId: selectedModel,
        shotId,
        parameters: { duration, resolution, modelId: getActualModelId() },  // 使用自定义模型名称或选中的模型变体
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generation-tasks", projectId] });
      toast.success("任务已加入生成队列");
    },
    onError: (error: unknown) => {
      toast.error("生成任务创建失败", getApiErrorMessage(error));
    },
  });

  // 生成单个分镜
  const handleGenerateShot = (shotId: string) => {
    if (!selectedModel) {
      toast.error("请先选择视频模型");
      return;
    }
    createTaskMutation.mutate(shotId);
  };

  // 批量生成所有分镜
  const handleGenerateAll = () => {
    if (!selectedModel) {
      toast.error("请先选择视频模型");
      return;
    }
    if (!storyboard?.shots?.length) {
      toast.error("暂无分镜");
      return;
    }
    storyboard.shots.forEach((shot) => {
      createTaskMutation.mutate(shot.id);
    });
  };

  // 获取分镜对应的任务状态
  const getTaskForShot = (shotId: string): GenerationTask | undefined => {
    return tasks.find((t) => t.shotId === shotId);
  };

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "queued": return "排队中";
      case "processing": return "生成中";
      case "completed": return "已完成";
      case "failed": return "失败";
      default: return "待生成";
    }
  };

  // 获取状态变体
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "processing": return "warning";
      case "failed": return "error";
      default: return "info";
    }
  };

  const isLoading = storyboardLoading || tasksLoading;
  const error = storyboardError || tasksError;
  const shots = storyboard?.shots || [];

  // 错误状态
  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <BackButton href={`/projects/${projectId}/studio`} label="故事编排" className="mb-4" />
        <ErrorState
          title="加载失败"
          message={error.message || "无法加载数据，请重试"}
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
            queryClient.invalidateQueries({ queryKey: ["generation-tasks", projectId] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <BackButton href={`/projects/${projectId}/studio`} label="故事编排" className="mb-2" />
          <h1 className="font-display text-3xl font-bold text-white mb-1">视频生成</h1>
          <p className="text-text-secondary">将分镜转为视频片段</p>
        </div>
        <Button className="gap-2" onClick={handleGenerateAll} disabled={isLoading || !selectedModel || shots.length === 0}>
          <WandIcon className="w-4 h-4" />
          全部生成
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>生成配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">模型</label>
              <select
                className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setSelectedModelVariant("");  // 切换模型时重置变体
                }}
              >
                {configuredVideoModels.length === 0 && <option value="">暂无已配置模型</option>}
                {configuredVideoModels.map((model: { id: string; name: string }) => {
                  const key = configuredVideoKeys.find((k: { modelId: string }) => k.modelId === model.id);
                  return (
                    <option key={model.id} value={model.id}>
                      {key?.alias || model.name}
                    </option>
                  );
                })}
              </select>
              {configuredVideoModels.length === 0 && (
                <p className="text-xs text-warm-orange mt-1">
                  ⚠️ 未配置视频模型，请先<Link href="/settings/models" className="text-anime-purple hover:underline ml-1">配置模型</Link>
                </p>
              )}
            </div>

            {/* 模型版本 - 显示用户配置的模型名称 */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">模型版本</label>
              <select
                className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                value={selectedModelVariant}
                onChange={(e) => setSelectedModelVariant(e.target.value)}
              >
                {selectedModelAlias ? (
                  <option value={selectedModelAlias}>{selectedModelAlias}</option>
                ) : (
                  <option value="">请选择模型</option>
                )}
              </select>
              <p className="text-[10px] text-text-disabled mt-1">
                {selectedModelAlias ? "使用配置页面设置的模型名称" : "请先在配置页面设置模型别名"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">时长</label>
                <select
                  className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={3}>3 秒</option>
                  <option value={5}>5 秒</option>
                  <option value={10}>10 秒</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">分辨率</label>
                <select
                  className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                >
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState message="加载分镜中..." />
      ) : shots.length === 0 ? (
        <EmptyState
          icon={FilmIcon}
          title="暂无分镜"
          description="请先在故事编排页面生成分镜"
          action={{
            label: "前往故事编排",
            onClick: () => window.location.href = `/projects/${projectId}/studio`,
          }}
        />
      ) : (
        <div className="space-y-3">
          {shots.map((shot) => {
            const task = getTaskForShot(shot.id);
            const status = task?.status || "pending";
            const isProcessing = status === "queued" || status === "processing";
            const hasVideo = status === "completed" && task?.result?.url;

            return (
              <div key={shot.id} className="flex items-center gap-4 p-4 rounded-lg bg-panel-deep border border-divider">
                <span className="text-text-disabled font-mono text-sm w-8">#{shot.sequence}</span>

                {/* 分镜预览图 / 视频缩略图 */}
                <div className="w-20 h-20 rounded-lg bg-panel-mid overflow-hidden flex-shrink-0 relative group">
                  {hasVideo ? (
                    <div className="w-full h-full relative">
                      <video
                        src={task!.result!.url!}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : shot.imageUrl ? (
                    <Image src={shot.imageUrl} alt={`Shot ${shot.sequence}`} width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlayIcon className="w-6 h-6 text-text-disabled" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-white font-medium">{shot.prompt?.substring(0, 50) || `分镜 ${shot.sequence}`}</p>
                  {hasVideo && (
                    <p className="text-xs text-neon-cyan mt-1">✓ 视频已生成</p>
                  )}
                  {task?.errorMessage && (
                    <p className="text-xs text-warm-orange mt-1">{task.errorMessage}</p>
                  )}
                </div>

                <Badge variant={getStatusVariant(status)}>
                  {isProcessing && (
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-1" />
                  )}
                  {getStatusText(status)}
                </Badge>

                {/* 操作按钮 */}
                {hasVideo ? (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setPreviewVideo({ url: task.result!.url!, shotId: shot.id })}>
                    <PlayIcon className="w-3 h-3" /> 预览
                  </Button>
                ) : status === "failed" ? (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleGenerateShot(shot.id)}>
                    <RefreshCwIcon className="w-3 h-3" /> 重试
                  </Button>
                ) : !isProcessing ? (
                  <Button size="sm" className="gap-1" onClick={() => handleGenerateShot(shot.id)}>
                    <WandIcon className="w-3 h-3" /> 生成
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* 视频预览弹窗 */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewVideo(null)}>
          <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-xl overflow-hidden bg-black">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="w-full max-h-[80vh] object-contain"
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-white text-sm">
                分镜 #{shots.find(s => s.id === previewVideo.shotId)?.sequence || '?'} 视频预览
              </p>
              <div className="flex gap-2">
                <a href={previewVideo.url} download target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    下载
                  </Button>
                </a>
                <Button size="sm" variant="ghost" onClick={() => setPreviewVideo(null)}>关闭</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
