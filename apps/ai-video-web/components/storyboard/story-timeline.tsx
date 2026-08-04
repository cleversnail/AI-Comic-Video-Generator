"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayIcon, WandIcon } from "@/components/icons";
import { generationsApi, Shot, GenerationTask } from "@/lib/api";

interface StoryTimelineProps {
  projectId: string;
  shots: Shot[];
}

export function StoryTimeline({ projectId, shots }: StoryTimelineProps) {
  const [selectedShotId, setSelectedShotId] = useState<string | null>(
    shots.length > 0 ? shots[0].id : null
  );
  const timelineRef = useRef<HTMLDivElement>(null);

  // 获取生成任务（用于判断视频是否已生成）
  const { data: tasks = [] } = useQuery({
    queryKey: ["generation-tasks", projectId],
    queryFn: () => generationsApi.listTasks(projectId),
  });

  // 构建 shotId → 最新已完成任务的映射
  const videoTaskMap = useMemo(() => {
    const map = new Map<string, GenerationTask>();
    for (const task of tasks) {
      if (task.status !== "completed" || !task.shotId) continue;
      const existing = map.get(task.shotId);
      if (!existing || new Date(task.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        map.set(task.shotId, task);
      }
    }
    return map;
  }, [tasks]);

  const selectedShot = shots.find((s) => s.id === selectedShotId) || null;

  // 统计
  const totalDuration = shots.reduce((sum, s) => sum + (s.duration || 3000), 0) / 1000;
  const generatedVideoCount = shots.filter((s) => videoTaskMap.has(s.id)).length;

  // 滚动到选中的卡片
  useEffect(() => {
    if (!selectedShotId || !timelineRef.current) return;
    const card = timelineRef.current.querySelector(`[data-shot-id="${selectedShotId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedShotId]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m${s}s`;
  };

  if (shots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-text-secondary mb-4">暂无分镜，请先在故事 Tab 生成分镜</p>
          <p className="text-xs text-text-disabled">生成分镜后可在这里查看时间轴视图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部统计栏 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-divider flex-shrink-0">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-text-secondary">
            总时长 <span className="text-white font-medium">{formatDuration(totalDuration)}</span>
          </span>
          <span className="text-text-disabled">·</span>
          <span className="text-text-secondary">
            分镜 <span className="text-white font-medium">{shots.length}</span>
          </span>
          <span className="text-text-disabled">·</span>
          <span className="text-text-secondary">
            已生成视频 <span className="text-neon-cyan font-medium">{generatedVideoCount}</span>/{shots.length}
          </span>
        </div>
        <Link href={`/projects/${projectId}/generate`}>
          <Button size="sm" variant="outline" className="gap-1.5">
            <WandIcon className="w-3.5 h-3.5" /> 去生成视频
          </Button>
        </Link>
      </div>

      {/* 时间轴区域 */}
      <div
        ref={timelineRef}
        className="flex gap-3 px-6 py-4 overflow-x-auto flex-shrink-0 scrollbar-thin"
      >
        {shots.map((shot) => {
          const isSelected = selectedShotId === shot.id;
          const videoTask = videoTaskMap.get(shot.id);
          const hasVideo = !!videoTask;
          const thumbnailUrl = videoTask?.result?.url || shot.resultUrl || shot.imageUrl;
          const duration = (shot.duration || 3000) / 1000;

          return (
            <div
              key={shot.id}
              data-shot-id={shot.id}
              onClick={() => setSelectedShotId(shot.id)}
              className={`flex-shrink-0 w-28 cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                isSelected
                  ? "border-anime-purple shadow-lg shadow-anime-purple/20"
                  : "border-divider hover:border-anime-purple/50"
              }`}
            >
              {/* 缩略图 */}
              <div className="aspect-[3/4] bg-panel-mid relative">
                {thumbnailUrl ? (
                  hasVideo ? (
                    <div className="w-full h-full relative">
                      <video
                        src={thumbnailUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <PlayIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={thumbnailUrl}
                      alt={`Shot ${shot.sequence}`}
                      width={112}
                      height={149}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl text-text-disabled">🎬</span>
                  </div>
                )}

                {/* 状态角标 */}
                {hasVideo ? (
                  <Badge className="absolute top-1.5 right-1.5 text-[9px] bg-neon-cyan/90 text-white border-0">
                    ✓
                  </Badge>
                ) : shot.status === "previewed" ? (
                  <Badge className="absolute top-1.5 right-1.5 text-[9px] bg-anime-purple/90 text-white border-0">
                    预览
                  </Badge>
                ) : null}
              </div>

              {/* 信息条 */}
              <div className="bg-panel-deep px-2 py-1.5">
                <p className="text-[10px] text-text-secondary">#{shot.sequence}</p>
                <p className="text-[10px] text-text-disabled">{formatDuration(duration)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 选中分镜详情 */}
      {selectedShot && (
        <div className="flex-1 border-t border-divider overflow-auto">
          <div className="flex gap-6 p-6 max-w-5xl">
            {/* 左侧：预览图 / 视频 */}
            <div className="w-48 flex-shrink-0">
              <div className="aspect-[3/4] rounded-lg bg-panel-mid overflow-hidden relative">
                {(() => {
                  const videoTask = videoTaskMap.get(selectedShot.id);
                  const url = videoTask?.result?.url || selectedShot.resultUrl || selectedShot.imageUrl;
                  if (videoTask?.result?.url) {
                    return (
                      <video
                        src={videoTask.result.url}
                        controls
                        className="w-full h-full object-contain bg-black"
                      />
                    );
                  }
                  if (url) {
                    return (
                      <Image src={url} alt={`Shot ${selectedShot.sequence}`} width={192} height={256} className="w-full h-full object-cover" />
                    );
                  }
                  return (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl text-text-disabled">🎬</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 右侧：文字详情 */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-lg font-bold text-white">
                  #{selectedShot.sequence}
                </h3>
                {(() => {
                  const vt = videoTaskMap.get(selectedShot.id);
                  if (vt) return <Badge variant="success" className="text-[10px]">视频已生成</Badge>;
                  if (selectedShot.status === "previewed") return <Badge variant="info" className="text-[10px]">已预览</Badge>;
                  return <Badge variant="info" className="text-[10px]">待生成</Badge>;
                })()}
              </div>

              {/* 标题 */}
              {selectedShot.params?.title && (
                <p className="text-white font-medium">{selectedShot.params.title}</p>
              )}

              {/* 台词 */}
              {selectedShot.params?.dialogue && (
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">💬</span>
                  <div>
                    <p className="text-xs text-text-disabled mb-0.5">台词</p>
                    <p className="text-sm text-white">{selectedShot.params.dialogue}</p>
                  </div>
                </div>
              )}

              {/* 旁白 */}
              {selectedShot.params?.narration && (
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">📖</span>
                  <div>
                    <p className="text-xs text-text-disabled mb-0.5">旁白</p>
                    <p className="text-sm text-white">{selectedShot.params.narration}</p>
                  </div>
                </div>
              )}

              {/* 场景描述 */}
              {selectedShot.params?.description && (
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">🎬</span>
                  <div>
                    <p className="text-xs text-text-disabled mb-0.5">画面描述</p>
                    <p className="text-sm text-text-secondary">{selectedShot.params.description}</p>
                  </div>
                </div>
              )}

              {/* 英文 Prompt */}
              {selectedShot.prompt && (
                <details className="group">
                  <summary className="text-xs text-text-disabled cursor-pointer hover:text-text-secondary transition-colors">
                    查看生成 Prompt（英文）
                  </summary>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed bg-panel-mid rounded-lg p-3 border border-divider">
                    {selectedShot.prompt}
                  </p>
                </details>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 pt-2">
                <Link href={`/projects/${projectId}/generate`}>
                  <Button size="sm" className="gap-1.5">
                    <WandIcon className="w-3.5 h-3.5" /> 生成视频
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
