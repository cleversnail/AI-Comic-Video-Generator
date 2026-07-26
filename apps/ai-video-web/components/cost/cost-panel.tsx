"use client";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { modelsApi } from "@/lib/api";

const capabilityLabels: Record<string, string> = {
  llm: "大语言模型",
  image: "图像生成",
  video: "视频生成",
  tts: "语音合成",
};

const capabilityColors: Record<string, string> = {
  llm: "bg-blue-500",
  image: "bg-purple-500",
  video: "bg-orange-500",
  tts: "bg-green-500",
};

const capabilityIcons: Record<string, string> = {
  llm: "💬",
  image: "🖼️",
  video: "🎬",
  tts: "🔊",
};

export function CostPanel() {
  const { data: costSummary, isLoading } = useQuery({
    queryKey: ["costSummary"],
    queryFn: () => modelsApi.getCostSummary(),
  });

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-panel-mid/50 border border-divider animate-pulse">
        <div className="h-6 w-32 bg-panel-mid rounded mb-4" />
        <div className="h-20 bg-panel-mid rounded" />
      </div>
    );
  }

  if (!costSummary) return null;

  const maxCost = Math.max(...costSummary.byCapability.map((c) => c.cost), 1);

  return (
    <div className="space-y-6">
      {/* Total Overview */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-anime-purple/10 to-panel-mid border border-divider">
        <h3 className="text-sm font-medium text-text-secondary mb-2">总使用成本</h3>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-display font-bold text-white">
            ¥{costSummary.totalCost.toFixed(2)}
          </span>
          <span className="text-sm text-text-secondary mb-1">
            / {costSummary.totalCalls} 次调用
          </span>
        </div>
      </div>

      {/* By Capability */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-secondary">按能力分类</h4>
        {costSummary.byCapability.map((item, index) => (
          <motion.div
            key={item.capability}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-xl bg-panel-mid border border-divider"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{capabilityIcons[item.capability] || "📦"}</span>
                <span className="text-sm font-medium text-white">
                  {capabilityLabels[item.capability] || item.capability}
                </span>
              </div>
              <span className="text-sm font-mono text-anime-purple">
                ¥{item.cost.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-panel-deep overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.cost / maxCost) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`h-full rounded-full ${capabilityColors[item.capability] || "bg-gray-500"}`}
                />
              </div>
              <span className="text-xs text-text-disabled w-16 text-right">
                {item.calls} 次
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Per Key Details */}
      {costSummary.keys.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-text-secondary">API Key 使用详情</h4>
          <div className="space-y-2">
            {costSummary.keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 rounded-lg bg-panel-mid/50 border border-divider"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm">{capabilityIcons[key.capability] || "🔑"}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{key.alias}</p>
                    <p className="text-xs text-text-disabled">{key.modelName}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono text-anime-purple">
                    ¥{key.estimatedCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-text-disabled">{key.totalCalls} 次</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-400">
          💡 成本统计基于 API 调用次数估算，实际费用请以各平台账单为准。
        </p>
      </div>
    </div>
  );
}
