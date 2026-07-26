"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { storyboardApi, AuditResult } from "@/lib/api";

interface AuditPanelProps {
  projectId: string;
}

const gradeColors: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "bg-green-500/20", text: "text-green-400", label: "优秀" },
  B: { bg: "bg-blue-500/20", text: "text-blue-400", label: "良好" },
  C: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "一般" },
  D: { bg: "bg-red-500/20", text: "text-red-400", label: "待改进" },
};

const dimensionLabels: Record<string, { label: string; icon: string }> = {
  structure: { label: "故事结构", icon: "📐" },
  dialogue: { label: "对话质量", icon: "💬" },
  pacing: { label: "节奏把控", icon: "⏱️" },
  visual: { label: "视觉描述", icon: "🎨" },
  emotion: { label: "情感表达", icon: "🎭" },
};

export function AuditPanel({ projectId }: AuditPanelProps) {
  const [result, setResult] = useState<AuditResult | null>(null);

  const auditMutation = useMutation({
    mutationFn: () => storyboardApi.auditScript(projectId),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const gradeInfo = result ? gradeColors[result.grade] : null;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">剧本质量审计</h2>
          <p className="text-text-secondary text-sm mt-1">
            AI 分析剧本结构、对话、节奏、视觉和情感表达
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => auditMutation.mutate()}
          isLoading={auditMutation.isPending}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          {auditMutation.isPending ? "分析中..." : "开始审计"}
        </Button>
      </div>

      {/* Error State */}
      {auditMutation.isError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
          <p className="text-sm text-red-400">
            审计失败：{(auditMutation.error as any)?.message || "请检查 LLM API Key 配置"}
          </p>
        </div>
      )}

      {/* No Result State */}
      {!result && !auditMutation.isPending && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-panel-mid flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <p className="text-text-secondary mb-2">点击「开始审计」分析剧本质量</p>
          <p className="text-xs text-text-disabled">AI 将从 5 个维度评估剧本并给出优化建议</p>
        </div>
      )}

      {/* Loading State */}
      {auditMutation.isPending && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full border-4 border-anime-purple border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">AI 正在分析剧本...</p>
          <p className="text-xs text-text-disabled mt-1">这可能需要 10-30 秒</p>
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score Overview */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-anime-purple/10 to-panel-mid border border-divider">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className={`w-24 h-24 rounded-full ${gradeInfo?.bg} flex items-center justify-center mx-auto mb-2`}>
                    <span className={`text-4xl font-display font-bold ${gradeInfo?.text}`}>
                      {result.grade}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${gradeInfo?.text}`}>{gradeInfo?.label}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-display font-bold text-white">{result.score}</span>
                    <span className="text-lg text-text-secondary mb-1">/100</span>
                  </div>
                  <p className="text-text-secondary">{result.summary}</p>
                </div>
              </div>
            </div>

            {/* Dimension Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(result.details).map(([key, detail], index) => {
                const dimInfo = dimensionLabels[key];
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-panel-mid border border-divider"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{dimInfo?.icon}</span>
                        <span className="text-sm font-medium text-white">{dimInfo?.label}</span>
                      </div>
                      <span className="text-sm font-mono text-anime-purple">{detail.score}/20</span>
                    </div>
                    <div className="h-2 rounded-full bg-panel-deep overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(detail.score / 20) * 100}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full rounded-full bg-anime-purple"
                      />
                    </div>
                    <p className="text-xs text-text-secondary">{detail.feedback}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="p-4 rounded-xl bg-panel-mid border border-divider">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-anime-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  优化建议
                </h4>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-anime-purple mt-0.5">•</span>
                      <span className="text-sm text-text-secondary">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
