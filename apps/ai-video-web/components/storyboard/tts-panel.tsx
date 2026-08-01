"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { storyboardApi, modelsApi } from "@/lib/api";
import type { Shot } from "@/lib/api";
import Link from "next/link";

interface TtsPanelProps {
  projectId: string;
  shots: Shot[];
}

const voiceOptions = [
  { id: 'male-qn-qingse', label: '青涩男声', gender: '男' },
  { id: 'male-qn-jingying', label: '精英男声', gender: '男' },
  { id: 'male-qn-badao', label: '霸道男声', gender: '男' },
  { id: 'female-shaonv', label: '少女音', gender: '女' },
  { id: 'female-yujie', label: '御姐音', gender: '女' },
  { id: 'female-chengshu', label: '成熟女声', gender: '女' },
  { id: 'presenter_male', label: '男主持人', gender: '男' },
  { id: 'presenter_female', label: '女主持人', gender: '女' },
];

import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/error";

export function TtsPanel({ projectId, shots }: TtsPanelProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedVoice, setSelectedVoice] = useState('male-qn-qingse');
  const [speed, setSpeed] = useState(1.0);
  const [results, setResults] = useState<Array<{ shotId: string; status: string; audioUrl?: string }>>([]);
  const [processingShotId, setProcessingShotId] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState<Record<string, number>>({});

  // 检查是否配置了 TTS API Key
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => modelsApi.listMyApiKeys(),
  });
  const hasTtsKey = apiKeys.some((k: { capability?: string }) => k.capability === "tts");

  // Clear results when shots update
  useEffect(() => {
    setResults([]);
  }, [shots]);

  const shotsWithText = shots.filter((shot) => {
    const params = shot.params || {};
    return params.dialogue || params.narration || params.subtitle;
  });

  const batchMutation = useMutation({
    mutationFn: () => storyboardApi.generateTtsBatch(projectId, {
      shotIds: shotsWithText.map((s) => s.id),
      voiceId: selectedVoice,
      speed,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      setResults(data.results || []);
      setProcessingShotId(null);
    },
    onError: (error: unknown) => {
      toast.error("批量配音失败", getApiErrorMessage(error));
      setProcessingShotId(null);
    },
  });

  const singleMutation = useMutation({
    mutationFn: (shotId: string) => {
      setProcessingShotId(shotId);
      return storyboardApi.generateTts(projectId, shotId, {
        voiceId: selectedVoice,
        speed,
      });
    },
    onSuccess: (_data, shotId) => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("配音生成成功");
      setProcessingShotId(null);
      // 递增该分镜的生成计数，强制 audio 元素重新渲染
      setGenerationCount((prev) => ({ ...prev, [shotId]: (prev[shotId] || 0) + 1 }));
    },
    onError: (error: unknown) => {
      toast.error("配音生成失败", getApiErrorMessage(error));
      setProcessingShotId(null);
    },
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">TTS 配音</h2>
          <p className="text-text-secondary text-sm mt-1">
            为分镜中的台词、旁白生成 AI 配音
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => batchMutation.mutate()}
          isLoading={batchMutation.isPending}
          disabled={shotsWithText.length === 0 || !hasTtsKey}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {batchMutation.isPending ? "生成中..." : `批量生成 (${shotsWithText.length})`}
        </Button>
      </div>

      {/* TTS 模型配置提示 */}
      {!hasTtsKey && (
        <div className="mb-4 p-4 rounded-xl bg-warm-orange/10 border border-warm-orange/20">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-warm-orange mb-1">需要配置语音合成模型</p>
              <p className="text-xs text-text-secondary mb-3">
                生成配音需要配置语音合成模型（如 MiniMax TTS）的 API Key
              </p>
              <Link href="/settings/models">
                <Button size="sm" variant="outline" className="gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
                  </svg>
                  去配置模型
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {shotsWithText.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-secondary">暂无分镜有台词/旁白/字幕</p>
          <p className="text-text-disabled text-sm mt-1">请先在分镜详情面板中添加台词或旁白</p>
        </div>
      ) : (
        <>
          {/* Voice & Speed Settings */}
          <div className="mb-6 p-4 rounded-xl bg-panel-mid/50 border border-divider">
            <h3 className="text-sm font-medium text-white mb-3">配音设置</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-2">音色选择</label>
                <div className="grid grid-cols-2 gap-2">
                  {voiceOptions.map((voice) => (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        selectedVoice === voice.id
                          ? "border-anime-purple bg-anime-purple/10"
                          : "border-divider bg-panel-deep hover:border-anime-purple/50"
                      }`}
                    >
                      <p className="text-xs font-medium text-white">{voice.label}</p>
                      <p className="text-[10px] text-text-secondary">{voice.gender}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-2">
                  语速：{speed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-anime-purple"
                />
                <div className="flex justify-between text-[10px] text-text-secondary">
                  <span>0.5x 慢</span>
                  <span>1.0x 正常</span>
                  <span>2.0x 快</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shots List */}
          <div className="space-y-3">
            {shotsWithText.map((shot, index) => {
              const params = shot.params || {};
              const hasAudio = !!params.audioUrl;
              const batchResult = results.find((r) => r.shotId === shot.id);

              return (
                <motion.div
                  key={shot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-panel-mid border border-divider"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-panel-deep flex items-center justify-center">
                    <span className="text-sm font-mono text-text-secondary">#{shot.sequence}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white truncate">
                        {params.title || `分镜 ${shot.sequence}`}
                      </p>
                      {hasAudio && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                          已配音
                        </span>
                      )}
                      {batchResult?.status === 'failed' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          失败
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary truncate">
                      {params.dialogue || params.narration || params.subtitle}
                    </p>
                  </div>

                  {/* Audio Player */}
                  {hasAudio && (
                    <audio controls className="h-8 w-40" key={`${shot.id}-${generationCount[shot.id] || 0}`}>
                      <source src={params.audioUrl} type="audio/mp3" />
                    </audio>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => singleMutation.mutate(shot.id)}
                    isLoading={processingShotId === shot.id}
                    disabled={!hasTtsKey || processingShotId !== null}
                  >
                    {hasAudio ? "重新生成" : "生成配音"}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Batch Results */}
          <AnimatePresence>
            {batchMutation.isSuccess && batchMutation.data && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
              >
                <p className="text-sm text-green-400 font-medium">
                  批量生成完成：成功 {batchMutation.data.success} 个，失败 {batchMutation.data.failed} 个
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
