"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { storyboardApi, NovelSplitConfig, NovelSplitPreview } from "@/lib/api";

interface NovelSplitPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/error";

export function NovelSplitPanel({ projectId, isOpen, onClose }: NovelSplitPanelProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState("");
  const [config, setConfig] = useState<NovelSplitConfig>({
    splitByChapter: true,
    targetDuration: 120,
  });
  const [preview, setPreview] = useState<NovelSplitPreview | null>(null);

  const previewMutation = useMutation({
    mutationFn: () => storyboardApi.previewNovelSplit(projectId, { text, config }),
    onSuccess: (data) => {
      setPreview(data);
    },
    onError: (error: unknown) => {
      toast.error("分集预览失败", getApiErrorMessage(error));
    },
  });

  const splitMutation = useMutation({
    mutationFn: () => storyboardApi.executeNovelSplit(projectId, { text, config }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["episodes", projectId] });
      toast.success(`成功创建 ${data.totalEpisodes} 集！`);
      onClose();
    },
    onError: (error: unknown) => {
      toast.error("分集失败", getApiErrorMessage(error));
    },
  });

  const handlePreview = () => {
    if (text.length < 100) {
      toast.error("文本过短", "至少需要 100 个字符");
      return;
    }
    previewMutation.mutate();
  };

  const handleSplit = () => {
    if (!preview) {
      toast.error("请先预览分集结果");
      return;
    }
    splitMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="w-full max-w-4xl max-h-[85vh] bg-panel-deep border border-divider rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider">
              <div>
                <h3 className="font-display text-lg font-bold text-white">长篇小说自动分集</h3>
                <p className="text-xs text-text-secondary">粘贴长篇文本，AI 自动分割为多集</p>
              </div>
              <button onClick={onClose} className="text-text-secondary hover:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      粘贴小说/故事文本
                    </label>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="在此粘贴长篇小说或故事文本..."
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-text-disabled mt-1">
                      已输入 {text.length} 个字符
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-panel-mid border border-divider space-y-3">
                    <h4 className="text-sm font-medium text-white">分集设置</h4>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.splitByChapter}
                          onChange={(e) => setConfig({ ...config, splitByChapter: e.target.checked })}
                          className="rounded border-divider"
                        />
                        <span className="text-sm text-text-secondary">按章节分割</span>
                      </label>
                    </div>

                    {!config.splitByChapter && (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          目标每集时长（秒）
                        </label>
                        <Input
                          type="number"
                          value={config.targetDuration || 120}
                          onChange={(e) => setConfig({ ...config, targetDuration: parseInt(e.target.value) })}
                          min={30}
                          max={300}
                        />
                      </div>
                    )}

                    {config.splitByChapter && (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          章节标题正则（可选）
                        </label>
                        <Input
                          value={config.chapterPattern || ""}
                          onChange={(e) => setConfig({ ...config, chapterPattern: e.target.value })}
                          placeholder="例如：^第[一二三四五六七八九十]+章"
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-text-disabled mt-1">
                          留空使用默认模式（第X章/回/节）
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handlePreview}
                      isLoading={previewMutation.isPending}
                      disabled={text.length < 100}
                      className="flex-1 gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      预览分集
                    </Button>
                    <Button
                      onClick={handleSplit}
                      isLoading={splitMutation.isPending}
                      disabled={!preview}
                      variant="secondary"
                      className="flex-1 gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      执行分集
                    </Button>
                  </div>
                </div>

                {/* Right: Preview */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-secondary">分集预览</h4>

                  {previewMutation.isPending && (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 rounded-full border-4 border-anime-purple border-t-transparent animate-spin mx-auto mb-4" />
                      <p className="text-text-secondary">AI 正在分析文本...</p>
                    </div>
                  )}

                  {previewMutation.isError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-400">
                        分析失败：{(previewMutation.error as any)?.message || "请检查 LLM API Key"}
                      </p>
                    </div>
                  )}

                  {preview && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      <div className="p-3 rounded-lg bg-panel-mid border border-divider">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-2xl font-display font-bold text-anime-purple">{preview.totalEpisodes}</p>
                            <p className="text-xs text-text-disabled">集</p>
                          </div>
                          <div>
                            <p className="text-2xl font-display font-bold text-white">{preview.totalWords}</p>
                            <p className="text-xs text-text-disabled">总字数</p>
                          </div>
                          <div>
                            <p className="text-2xl font-display font-bold text-white">{preview.averageWordsPerEpisode}</p>
                            <p className="text-xs text-text-disabled">平均每集</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {preview.episodes.map((ep) => (
                          <div
                            key={ep.number}
                            className="p-3 rounded-lg bg-panel-mid border border-divider"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-white">
                                第 {ep.number} 集：{ep.title}
                              </span>
                              <span className="text-xs text-text-disabled">
                                {ep.wordCount} 字 · {Math.round(ep.estimatedDuration / 60)} 分钟
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary line-clamp-2">
                              {ep.content.substring(0, 100)}...
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {!preview && !previewMutation.isPending && (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 rounded-full bg-panel-mid flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <p className="text-text-secondary">粘贴文本后点击「预览分集」</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
