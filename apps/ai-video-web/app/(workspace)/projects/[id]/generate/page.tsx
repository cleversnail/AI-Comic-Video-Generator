"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/navigation/back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WandIcon, PlayIcon, RefreshCwIcon, FilmIcon } from "@/components/icons";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-states";
import { storyboardApi, generationsApi, modelsApi, GenerationTask, Shot } from "@/lib/api";
import { useTaskProgress, TaskProgress } from "@/lib/websocket";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  }, []);

  useTaskProgress(projectId, handleTaskProgress);

  // 获取分镜列表
  const { data: storyboard, isLoading: storyboardLoading, error: storyboardError } = useQuery({
    queryKey: ["storyboard", projectId],
    queryFn: () => storyboardApi.getStoryboard(projectId),
  });

  // 获取生成任务列表
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ["generation-tasks", projectId],
    queryFn: () => generationsApi.listTasks(projectId),
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
  const [duration, setDuration] = useState(3);
  const [resolution, setResolution] = useState("1080p");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; shotId: string } | null>(null);
  const [pendingShotIds, setPendingShotIds] = useState<Set<string>>(new Set());
  const [showAllShots, setShowAllShots] = useState(false);
  const [confirmUnpreviewedShotId, setConfirmUnpreviewedShotId] = useState<string | null>(null);
  const [confirmGenerateAll, setConfirmGenerateAll] = useState(false);

  // 分镜分类：已预览（有 resultUrl 或 imageUrl）vs 未预览
  const shots = storyboard?.shots || [];
  const previewedShots = useMemo(() => shots.filter((s: Shot) => s.resultUrl || s.imageUrl), [shots]);
  const unpreviewedShots = useMemo(() => shots.filter((s: Shot) => !s.resultUrl && !s.imageUrl), [shots]);
  const displayShots = showAllShots ? shots : previewedShots;

  // 获取用户已配置的视频模型列表
  const configuredVideoKeys = apiKeys.filter((k: { capability?: string }) => k.capability === "video");

  // 获取当前选中模型的配置信息
  const selectedModelKey = configuredVideoKeys.find((k: { modelId: string }) => k.modelId === selectedModel);
  const selectedModelAlias = selectedModelKey?.alias || "";
  const isModelConfigured = !!selectedModelKey;

  // 设置默认模型
  useEffect(() => {
    if (videoModels.length === 0 || selectedModel) return;
    const configuredModel = configuredVideoKeys.find((k: { capability?: string }) => k.capability === "video");
    if (configuredModel) {
      setSelectedModel(configuredModel.modelId);
    } else {
      setSelectedModel(videoModels[0].id);
    }
  }, [videoModels, configuredVideoKeys, selectedModel]);

  // 创建生成任务的 mutation
  const createTaskMutation = useMutation({
    mutationFn: (shotId: string) =>
      generationsApi.createTask(projectId, {
        capability: "video",
        modelId: selectedModel,
        shotId,
        parameters: { duration, resolution, generateAudio },
      }),
    onMutate: (shotId) => {
      setPendingShotIds((prev) => new Set(prev).add(shotId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generation-tasks", projectId] });
      toast.success("任务已加入生成队列");
    },
    onError: (error: unknown) => {
      toast.error("生成任务创建失败", getApiErrorMessage(error));
    },
    onSettled: (_data, _error, shotId) => {
      setPendingShotIds((prev) => {
        const next = new Set(prev);
        next.delete(shotId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["generation-tasks", projectId] });
    },
  });

  // 生成单个分镜（已预览的直接生成，未预览的弹确认框）
  const handleGenerateShot = (shotId: string, hasPreview: boolean) => {
    if (!selectedModel) {
      toast.error("请先选择视频模型");
      return;
    }
    if (!hasPreview) {
      setConfirmUnpreviewedShotId(shotId);
      return;
    }
    createTaskMutation.mutate(shotId);
  };

  // 批量生成：默认只生成已预览的
  const handleGenerateAll = () => {
    if (!selectedModel) {
      toast.error("请先选择视频模型");
      return;
    }
    if (previewedShots.length === 0) {
      toast.error("暂无已预览的分镜，请先生成预览图");
      return;
    }
    // 如果有未预览的分镜且当前未展开，提示一下
    if (unpreviewedShots.length > 0 && !showAllShots) {
      setConfirmGenerateAll(true);
      return;
    }
    // 展开状态下，全部生成（含未预览的需确认）
    doGenerateAll(displayShots);
  };

  const doGenerateAll = (targetShots: Shot[]) => {
    targetShots.forEach((shot) => {
      createTaskMutation.mutate(shot.id);
    });
  };

  // 构建 shotId → 最新任务的映射
  const taskMap = useMemo(() => {
    const map = new Map<string, GenerationTask>();
    for (const task of tasks) {
      const existing = map.get(task.shotId || "");
      if (!existing || new Date(task.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        if (task.shotId) map.set(task.shotId, task);
      }
    }
    return map;
  }, [tasks]);

  const getTaskForShot = (shotId: string): GenerationTask | undefined => taskMap.get(shotId);

  const getStatusText = (status: string) => {
    switch (status) {
      case "queued": return "排队中";
      case "processing": return "生成中";
      case "completed": return "已完成";
      case "failed": return "失败";
      default: return "待生成";
    }
  };

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

  // 视频预览 ESC 关闭
  useEffect(() => {
    if (!previewVideo) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewVideo(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [previewVideo]);

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <BackButton href={`/projects/${projectId}/studio`} label="故事编排" className="mb-2" />
          <h1 className="font-display text-3xl font-bold text-white mb-1">视频生成</h1>
          <p className="text-text-secondary">将分镜转为视频片段</p>
        </div>
        <Button
          className="gap-2"
          onClick={handleGenerateAll}
          disabled={isLoading || !selectedModel || previewedShots.length === 0}
        >
          <WandIcon className="w-4 h-4" />
          {showAllShots && unpreviewedShots.length > 0
            ? `全部生成（含 ${unpreviewedShots.length} 个未预览）`
            : "全部生成"}
        </Button>
      </div>

      {/* 生成配置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>生成配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end pb-5">
            <div className="flex-1 relative">
              <label className="block text-sm text-text-secondary mb-1">模型</label>
              <select
                className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {videoModels.length === 0 && <option value="">暂无可用模型</option>}
                {videoModels.map((model: { id: string; name: string }) => {
                  const isConfigured = configuredVideoKeys.some((k: { modelId: string }) => k.modelId === model.id);
                  return (
                    <option key={model.id} value={model.id}>
                      {model.name} {isConfigured ? "✓" : ""}
                    </option>
                  );
                })}
              </select>
              {!isModelConfigured && selectedModel && (
                <p className="absolute top-full left-0 right-0 text-xs text-warm-orange mt-1 flex items-center gap-1 whitespace-nowrap">
                  <span>⚠️</span>
                  <span>未配置，请先</span>
                  <Link href="/settings/models" className="text-anime-purple hover:underline">配置</Link>
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm text-text-secondary mb-1">模型版本</label>
              <div className="w-full h-10 rounded-lg border border-divider bg-panel-mid/50 px-3 flex items-center text-sm text-text-secondary">
                {selectedModelAlias || "默认版本"}
              </div>
            </div>
            <div className="w-28">
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
            <div className="w-28">
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
            <div className="flex items-center">
              <label className="flex items-center gap-2.5 cursor-pointer select-none h-10 px-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={generateAudio}
                  onClick={() => setGenerateAudio(!generateAudio)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    generateAudio ? "bg-anime-purple" : "bg-divider"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      generateAudio ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
                <span className="text-sm text-text-secondary whitespace-nowrap">包含配音</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 内容区 */}
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
        <>
          {/* 状态提示条 */}
          {unpreviewedShots.length > 0 && (
            <div className="mb-4 p-4 rounded-xl bg-panel-deep border border-divider flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-neon-cyan text-sm">✓</span>
                </div>
                <div>
                  <p className="text-sm text-white">
                    <span className="text-neon-cyan font-medium">{previewedShots.length}</span> 个分镜已生成预览，可直接生成视频
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    还有 <span className="text-warm-orange">{unpreviewedShots.length}</span> 个分镜未预览，建议先生成预览图，预览图可以提前确认画面构图、角色形象和镜头角度是否符合预期，避免视频生成后才发现画面不对而浪费额度
                  </p>
                </div>
              </div>
              {!showAllShots && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 flex-shrink-0"
                  onClick={() => setShowAllShots(true)}
                >
                  查看全部 {shots.length} 个分镜
                </Button>
              )}
            </div>
          )}

          {/* 分镜列表 */}
          <div className="space-y-3">
            {displayShots.map((shot: Shot) => {
              const task = getTaskForShot(shot.id);
              const status = task?.status || "pending";
              const isProcessing = status === "queued" || status === "processing" || pendingShotIds.has(shot.id);
              const hasVideo = status === "completed" && task?.result?.url;
              const hasPreview = !!(shot.resultUrl || shot.imageUrl);
              const isUnpreviewed = !hasPreview;

              return (
                <div
                  key={shot.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    isUnpreviewed
                      ? "bg-panel-deep/60 border-warm-orange/20 opacity-80"
                      : "bg-panel-deep border-divider"
                  }`}
                >
                  <span className="text-text-disabled font-mono text-sm w-8">#{shot.sequence}</span>

                  {/* 缩略图 */}
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
                    ) : hasPreview ? (
                      <Image src={shot.resultUrl || shot.imageUrl!} alt={`Shot ${shot.sequence}`} width={80} height={80} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayIcon className="w-6 h-6 text-text-disabled" />
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{shot.prompt?.substring(0, 50) || `分镜 ${shot.sequence}`}</p>
                    {hasVideo && <p className="text-xs text-neon-cyan mt-1">✓ 视频已生成</p>}
                    {isUnpreviewed && !hasVideo && <p className="text-xs text-warm-orange mt-1">⚠ 未生成预览图</p>}
                    {task?.errorMessage && <p className="text-xs text-warm-orange mt-1">{task.errorMessage}</p>}
                  </div>

                  {/* 状态 */}
                  <Badge variant={isUnpreviewed && !hasVideo && !isProcessing ? "warning" : getStatusVariant(status)}>
                    {isProcessing && (
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-1" />
                    )}
                    {isUnpreviewed && !hasVideo && !isProcessing ? "未预览" : getStatusText(status)}
                  </Badge>

                  {/* 操作按钮 */}
                  {hasVideo ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setPreviewVideo({ url: task.result!.url!, shotId: shot.id })}>
                      <PlayIcon className="w-3 h-3" /> 预览
                    </Button>
                  ) : status === "failed" ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleGenerateShot(shot.id, hasPreview)}>
                      <RefreshCwIcon className="w-3 h-3" /> 重试
                    </Button>
                  ) : !isProcessing ? (
                    <Button
                      size="sm"
                      variant={isUnpreviewed ? "outline" : "primary"}
                      className="gap-1"
                      onClick={() => handleGenerateShot(shot.id, hasPreview)}
                    >
                      <WandIcon className="w-3 h-3" />
                      {isUnpreviewed ? "跳过预览" : "生成"}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
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
                分镜 #{shots.find((s: Shot) => s.id === previewVideo.shotId)?.sequence || '?'} 视频预览
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

      {/* 确认：跳过预览直接生成视频 */}
      <ConfirmDialog
        open={!!confirmUnpreviewedShotId}
        onClose={() => setConfirmUnpreviewedShotId(null)}
        onConfirm={() => { if (confirmUnpreviewedShotId) createTaskMutation.mutate(confirmUnpreviewedShotId); }}
        title="跳过预览，直接生成视频？"
        description="该分镜未生成预览图，AI 将直接根据文字描述生成视频，结果可能与预期不符。建议先生成预览确认画面。"
        confirmText="直接生成"
        variant="danger"
      />

      {/* 确认：批量生成（仅已预览的） */}
      <ConfirmDialog
        open={confirmGenerateAll}
        onClose={() => setConfirmGenerateAll(false)}
        onConfirm={() => doGenerateAll(previewedShots)}
        title={`只生成已预览的 ${previewedShots.length} 个分镜？`}
        description={`还有 ${unpreviewedShots.length} 个分镜未生成预览图，将跳过这些分镜。如需全部生成，请先展开查看全部分镜。`}
        confirmText={`生成 ${previewedShots.length} 个`}
      />
    </div>
  );
}
