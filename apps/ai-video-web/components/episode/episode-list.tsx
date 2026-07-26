"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { projectsApi, Episode } from "@/lib/api";

interface EpisodeListProps {
  projectId: string;
  selectedEpisodeId?: string | null;
  onSelectEpisode?: (episodeId: string | null) => void;
}

export function EpisodeList({ projectId, selectedEpisodeId, onSelectEpisode }: EpisodeListProps) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: episodes = [], isLoading } = useQuery({
    queryKey: ["episodes", projectId],
    queryFn: () => projectsApi.listEpisodes(projectId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      projectsApi.createEpisode(projectId, {
        title: newTitle || undefined,
        description: newDescription || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", projectId] });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (episodeId: string) => projectsApi.deleteEpisode(projectId, episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes", projectId] });
      if (onSelectEpisode) onSelectEpisode(null);
    },
  });

  const handleCreate = () => {
    createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary">剧集管理</h3>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowCreate(true)}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建
        </Button>
      </div>

      {/* All Episodes Button */}
      <button
        onClick={() => onSelectEpisode?.(null)}
        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
          !selectedEpisodeId
            ? "border-anime-purple bg-anime-purple/10"
            : "border-divider bg-panel-mid hover:border-anime-purple/50"
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-anime-purple/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-anime-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-white">全部分镜</p>
          <p className="text-xs text-text-disabled">查看所有剧集的分镜</p>
        </div>
      </button>

      {/* Episode List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-panel-mid animate-pulse" />
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-text-disabled">暂无剧集</p>
          <p className="text-[10px] text-text-disabled mt-1">点击「新建」创建第一集</p>
        </div>
      ) : (
        <div className="space-y-2">
          {episodes.map((episode, index) => (
            <motion.div
              key={episode.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all group ${
                selectedEpisodeId === episode.id
                  ? "border-anime-purple bg-anime-purple/10"
                  : "border-divider bg-panel-mid hover:border-anime-purple/50"
              }`}
              onClick={() => onSelectEpisode?.(episode.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-panel-deep flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-mono text-anime-purple">{episode.number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{episode.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-disabled">
                    {episode.storyboardCount || 0} 个分镜
                  </span>
                  <Badge
                    variant={episode.status === "completed" ? "success" : "default"}
                    className="text-[10px]"
                  >
                    {episode.status === "completed" ? "已完成" : "草稿"}
                  </Badge>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`确定要删除「${episode.title}」吗？`)) {
                    deleteMutation.mutate(episode.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-text-disabled hover:text-warm-orange transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-panel-deep border border-divider rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="font-display text-lg font-bold text-white mb-4">新建剧集</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">标题</label>
                  <Input
                    placeholder={`第 ${(episodes.length || 0) + 1} 集`}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">简介（可选）</label>
                  <Textarea
                    placeholder="本集剧情简介..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>
                  取消
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  isLoading={createMutation.isPending}
                >
                  创建
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
