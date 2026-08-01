"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { projectsApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface VersionHistoryProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistory({ projectId, isOpen, onClose }: VersionHistoryProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [label, setLabel] = useState("");

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["versions", projectId],
    queryFn: () => projectsApi.listVersions(projectId),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: () => projectsApi.createVersion(projectId, label || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", projectId] });
      setLabel("");
      toast.success("版本快照已保存");
    },
    onError: (error: unknown) => {
      toast.error("保存失败", getApiErrorMessage(error));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => projectsApi.restoreVersion(projectId, versionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["versions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
      toast.success("版本恢复成功", `已恢复到版本 ${data.restoredVersion}（${data.label}）`);
      onClose();
    },
    onError: (error: unknown) => {
      toast.error("恢复失败", getApiErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (versionId: string) => projectsApi.deleteVersion(projectId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", projectId] });
      toast.success("版本已删除");
    },
    onError: (error: unknown) => {
      toast.error("删除失败", getApiErrorMessage(error));
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString("zh-CN");
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
            className="w-full max-w-lg bg-panel-deep border border-divider rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider">
              <h3 className="font-display text-lg font-semibold text-white">版本历史</h3>
              <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Create Version */}
            <div className="p-4 border-b border-divider">
              <div className="flex gap-2">
                <Input
                  placeholder="版本标签（可选）"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => createMutation.mutate()}
                  isLoading={createMutation.isPending}
                  className="gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  保存快照
                </Button>
              </div>
              <p className="text-xs text-text-disabled mt-2">
                保存当前项目状态，随时可以恢复到此版本
              </p>
            </div>

            {/* Version List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-text-secondary">加载中...</div>
              ) : versions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-panel-mid flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <p className="text-text-secondary mb-1">暂无版本记录</p>
                  <p className="text-xs text-text-disabled">点击上方「保存快照」创建第一个版本</p>
                </div>
              ) : (
                <div className="divide-y divide-divider">
                  {versions.map((version, index) => (
                    <motion.div
                      key={version.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 hover:bg-panel-mid/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-anime-purple/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-mono text-anime-purple">v{version.version}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{version.label}</p>
                          <p className="text-xs text-text-disabled">{formatDate(version.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`确定要恢复到版本 ${version.version}（${version.label}）吗？\n\n当前状态会自动保存为新版本。`)) {
                              restoreMutation.mutate(version.id);
                            }
                          }}
                          isLoading={restoreMutation.isPending}
                        >
                          恢复
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-warm-orange border-warm-orange/30 hover:bg-warm-orange/10"
                          onClick={() => {
                            if (confirm("确定要删除此版本吗？")) {
                              deleteMutation.mutate(version.id);
                            }
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-divider bg-panel-mid/50">
              <p className="text-xs text-text-disabled text-center">
                💡 建议在重要修改前手动保存快照，恢复时会自动备份当前状态
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
