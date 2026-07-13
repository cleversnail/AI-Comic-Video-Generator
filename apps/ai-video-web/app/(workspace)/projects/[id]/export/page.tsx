"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/navigation/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayIcon, DownloadIcon, LoaderIcon, FilmIcon } from "@/components/icons";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-states";
import { storyboardApi, composeApi, generationsApi, Shot } from "@/lib/api";

export default function ExportPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();

  // 获取分镜列表
  const { data: storyboard, isLoading: storyboardLoading, error: storyboardError } = useQuery({
    queryKey: ["storyboard", projectId],
    queryFn: () => storyboardApi.getStoryboard(projectId),
  });

  // 获取生成任务（用于获取视频URL）
  const { data: tasks = [], error: tasksError } = useQuery({
    queryKey: ["generation-tasks", projectId],
    queryFn: () => generationsApi.listTasks(projectId),
  });

  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportQuality, setExportQuality] = useState("1080p");
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ outputUrl?: string } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // 合成导出 mutation
  const composeMutation = useMutation({
    mutationFn: () => composeApi.composeProject(projectId),
    onMutate: () => {
      setIsExporting(true);
      setExportResult(null);
      setExportError(null);
    },
    onSuccess: (data) => {
      setExportResult(data);
      setIsExporting(false);
    },
    onError: (error: Error) => {
      setIsExporting(false);
      setExportError(error.message || "导出失败，请重试");
    },
  });

  const handleExport = () => {
    composeMutation.mutate();
  };

  const shots = storyboard?.shots || [];
  const isLoading = storyboardLoading;
  const error = storyboardError || tasksError;

  // 获取已完成的视频片段
  const completedVideos = tasks
    .filter((t) => t.status === "completed" && t.resultUrl)
    .map((t) => ({
      id: t.id,
      shotId: t.shotId,
      url: t.resultUrl!,
      shot: shots.find((s) => s.id === t.shotId),
    }));

  // 计算总时长
  const totalDuration = shots.reduce((acc, shot) => acc + (shot.duration || 3), 0);

  // 错误状态
  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <BackButton href={`/projects/${projectId}/studio`} label="故事编排" className="mb-2" />
          <h1 className="font-display text-3xl font-bold text-white mb-1">后期导出</h1>
          <p className="text-text-secondary">合成并导出最终视频</p>
        </div>
        <Button
          size="lg"
          className="gap-2"
          onClick={handleExport}
          disabled={isExporting || completedVideos.length === 0 || isLoading}
        >
          {isExporting ? (
            <>
              <LoaderIcon className="w-4 h-4 animate-spin" /> 导出中...
            </>
          ) : (
            <>
              <DownloadIcon className="w-4 h-4" /> 导出视频
            </>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 视频预览区 */}
        <div className="lg:col-span-2 bg-panel-deep border border-divider rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-anime-purple/10 to-neon-cyan/5" />
          {exportResult?.outputUrl ? (
            <video
              src={exportResult.outputUrl}
              controls
              className="w-full h-full object-contain relative z-10"
            />
          ) : (
            <div className="relative z-10 text-center">
              <button className="w-16 h-16 rounded-full bg-anime-purple flex items-center justify-center hover:glow-purple transition-all mb-4 mx-auto">
                <PlayIcon className="w-6 h-6 text-white ml-1" />
              </button>
              <p className="text-text-secondary text-sm">
                {isExporting ? "正在合成视频，请稍候..." : "点击导出按钮生成最终视频"}
              </p>
            </div>
          )}
        </div>

        {/* 右侧面板 */}
        <div className="space-y-6">
          {/* 时间轴 */}
          <Card>
            <CardHeader>
              <CardTitle>时间轴</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <LoaderIcon className="w-5 h-5 animate-spin text-text-secondary" />
                </div>
              ) : shots.length === 0 ? (
                <EmptyState
                  icon={FilmIcon}
                  title="暂无分镜"
                  description="请先在故事编排页面生成分镜"
                  className="py-4"
                />
              ) : (
                <>
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {shots.map((shot) => {
                      const task = tasks.find((t) => t.shotId === shot.id);
                      const hasVideo = task?.status === "completed" && task?.resultUrl;

                      return (
                        <div
                          key={shot.id}
                          className={`h-8 rounded flex items-center justify-center text-xs text-white font-medium px-2 min-w-[60px] ${
                            hasVideo ? "bg-anime-purple" : "bg-panel-mid border border-divider"
                          }`}
                          title={shot.prompt || `分镜 ${shot.sequence}`}
                        >
                          {shot.sequence}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-text-disabled mt-2">
                    总时长: {totalDuration}秒 | 已完成: {completedVideos.length}/{shots.length}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 导出设置 */}
          <Card>
            <CardHeader>
              <CardTitle>导出设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">格式</label>
                  <select
                    className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="mp4">MP4</option>
                    <option value="mov">MOV</option>
                    <option value="webm">WebM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">画质</label>
                  <select
                    className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                    value={exportQuality}
                    onChange={(e) => setExportQuality(e.target.value)}
                  >
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="4k">4K</option>
                  </select>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={handleExport}
                  disabled={isExporting || completedVideos.length === 0 || isLoading}
                >
                  {isExporting ? "导出中..." : "开始导出"}
                </Button>
                {exportError && (
                  <p className="text-xs text-warm-orange mt-2">{exportError}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 导出结果 */}
          {exportResult?.outputUrl && (
            <Card>
              <CardHeader>
                <CardTitle>导出完成</CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full gap-2" asChild>
                  <a href={exportResult.outputUrl} download target="_blank" rel="noopener noreferrer">
                    <DownloadIcon className="w-4 h-4" /> 下载视频
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
