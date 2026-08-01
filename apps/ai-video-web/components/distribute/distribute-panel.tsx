"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { composeApi, PlatformConfig, DistributeConfig } from "@/lib/api";

interface DistributePanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PlatformSelection {
  platform: PlatformConfig;
  selected: boolean;
  title: string;
  description: string;
  tags: string[];
}

export function DistributePanel({ projectId, isOpen, onClose }: DistributePanelProps) {
  const [selections, setSelections] = useState<PlatformSelection[]>([]);
  const [exportResult, setExportResult] = useState<unknown>(null);

  const { data: platforms = [] } = useQuery({
    queryKey: ["distributePlatforms"],
    queryFn: () => composeApi.getPlatforms(),
    enabled: isOpen,
  });

  // Initialize selections when platforms load
  useEffect(() => {
    if (platforms.length > 0 && selections.length === 0) {
      setSelections(
        platforms.map((p) => ({
          platform: p,
          selected: false,
          title: "",
          description: "",
          tags: [],
        }))
      );
    }
  }, [platforms]);

  const suggestMutation = useMutation({
    mutationFn: (platformId: string) => composeApi.getSuggestedConfig(projectId, platformId),
    onSuccess: (data, platformId) => {
      setSelections((prev) =>
        prev.map((s) =>
          s.platform.id === platformId
            ? {
                ...s,
                selected: true,
                title: data.suggestedTitle,
                description: data.suggestedDescription,
                tags: data.suggestedTags,
              }
            : s
        )
      );
    },
  });

  const exportMutation = useMutation({
    mutationFn: (configs: DistributeConfig[]) => composeApi.exportPackages(projectId, configs),
    onSuccess: (data) => {
      setExportResult(data);
    },
  });

  const togglePlatform = (platformId: string) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.platform.id === platformId ? { ...s, selected: !s.selected } : s
      )
    );
  };

  const updateSelection = (platformId: string, field: string, value: unknown) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.platform.id === platformId ? { ...s, [field]: value } : s
      )
    );
  };

  const handleAutoFill = (platformId: string) => {
    suggestMutation.mutate(platformId);
  };

  const handleExport = () => {
    const configs: DistributeConfig[] = selections
      .filter((s) => s.selected)
      .map((s) => ({
        platformId: s.platform.id,
        title: s.title,
        description: s.description,
        tags: s.tags,
      }));

    exportMutation.mutate(configs);
  };

  const selectedCount = selections.filter((s) => s.selected).length;

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
            className="w-full max-w-3xl max-h-[80vh] bg-panel-deep border border-divider rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider">
              <div>
                <h3 className="font-display text-lg font-bold text-white">多平台分发</h3>
                <p className="text-xs text-text-secondary">选择平台并配置发布信息</p>
              </div>
              <button onClick={onClose} className="text-text-secondary hover:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Export Result */}
              {exportResult && (
                <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <h4 className="text-sm font-medium text-green-400 mb-2">导出完成</h4>
                  <p className="text-xs text-text-secondary">
                    共 {exportResult.totalPlatforms} 个平台，{exportResult.validPlatforms} 个配置有效
                  </p>
                  <div className="mt-2 space-y-1">
                    {exportResult.results.map((r: { platformId: string; platformName: string; validation: { valid: boolean; errors: string[] } }) => (
                      <div key={r.platformId} className="flex items-center gap-2 text-xs">
                        <span className={r.validation.valid ? "text-green-400" : "text-red-400"}>
                          {r.validation.valid ? "✓" : "✗"}
                        </span>
                        <span className="text-text-secondary">{r.platformName}</span>
                        {r.validation.errors.length > 0 && (
                          <span className="text-red-400">({r.validation.errors[0]})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Selection */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {selections.map((sel) => (
                  <motion.div
                    key={sel.platform.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      sel.selected
                        ? "border-anime-purple bg-anime-purple/10"
                        : "border-divider bg-panel-mid hover:border-anime-purple/50"
                    }`}
                    onClick={() => togglePlatform(sel.platform.id)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{sel.platform.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{sel.platform.name}</p>
                        <p className="text-[10px] text-text-disabled">{sel.platform.aspectRatio}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel-deep text-text-disabled">
                        {sel.platform.maxWidth}x{sel.platform.maxHeight}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel-deep text-text-disabled">
                        ≤{sel.platform.maxDuration}s
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Selected Platforms Config */}
              {selectedCount > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-secondary">
                    配置发布信息（{selectedCount} 个平台）
                  </h4>

                  {selections
                    .filter((s) => s.selected)
                    .map((sel) => (
                      <div
                        key={sel.platform.id}
                        className="p-4 rounded-xl bg-panel-mid border border-divider space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{sel.platform.icon}</span>
                            <span className="text-sm font-medium text-white">{sel.platform.name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAutoFill(sel.platform.id)}
                            isLoading={suggestMutation.isPending}
                          >
                            自动填充
                          </Button>
                        </div>

                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            标题（{sel.title.length}/{sel.platform.metadata.maxTitleLength}）
                          </label>
                          <Input
                            value={sel.title}
                            onChange={(e) => updateSelection(sel.platform.id, "title", e.target.value)}
                            placeholder={`输入${sel.platform.name}标题`}
                            maxLength={sel.platform.metadata.maxTitleLength}
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            描述（{sel.description.length}/{sel.platform.metadata.maxDescriptionLength}）
                          </label>
                          <Textarea
                            value={sel.description}
                            onChange={(e) => updateSelection(sel.platform.id, "description", e.target.value)}
                            placeholder="输入描述..."
                            className="min-h-[60px]"
                            maxLength={sel.platform.metadata.maxDescriptionLength}
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            标签（{sel.tags.length}/{sel.platform.metadata.maxTags}）
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {sel.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 rounded-full bg-anime-purple/20 text-anime-purple"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-divider flex items-center justify-between">
              <p className="text-xs text-text-disabled">
                {selectedCount} 个平台已选择
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>
                  取消
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={selectedCount === 0}
                  isLoading={exportMutation.isPending}
                >
                  {exportMutation.isPending ? "导出中..." : "导出分发包"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
