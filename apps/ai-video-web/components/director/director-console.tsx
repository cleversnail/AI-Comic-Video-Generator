"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Shot, storyboardApi, UpdateShotDto } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface DirectorConsoleProps {
  projectId: string;
  shots: Shot[];
  isOpen: boolean;
  onClose: () => void;
}

const shotSizeOptions = [
  { value: "extreme_close", label: "特写", desc: "面部细节", icon: "🔍" },
  { value: "close", label: "近景", desc: "胸部以上", icon: "👤" },
  { value: "medium", label: "中景", desc: "膝盖以上", icon: "🧑" },
  { value: "full", label: "全景", desc: "完整人物", icon: "🧍" },
  { value: "long", label: "远景", desc: "环境氛围", icon: "🏔️" },
];

const cameraAngleOptions = [
  { value: "eye_level", label: "平视", desc: "自然视角", icon: "👁️" },
  { value: "low_angle", label: "仰拍", desc: "从下向上", icon: "⬆️" },
  { value: "high_angle", label: "俯拍", desc: "从上向下", icon: "⬇️" },
  { value: "dutch_angle", label: "荷兰角", desc: "倾斜构图", icon: "↗️" },
  { value: "pov", label: "主观视角", desc: "第一人称", icon: "🎯" },
  { value: "over_shoulder", label: "过肩", desc: "对话场景", icon: "👥" },
];

const cameraMovementOptions = [
  { value: "static", label: "静止", desc: "固定机位", icon: "📌" },
  { value: "pan", label: "摇镜", desc: "水平旋转", icon: "↔️" },
  { value: "tilt", label: "俯仰", desc: "垂直旋转", icon: "↕️" },
  { value: "dolly_in", label: "推镜", desc: "镜头推进", icon: "➡️" },
  { value: "dolly_out", label: "拉镜", desc: "镜头拉远", icon: "⬅️" },
  { value: "tracking", label: "跟拍", desc: "跟随主体", icon: "🏃" },
  { value: "crane", label: "摇臂", desc: "升降镜头", icon: "🏗️" },
  { value: "orbit", label: "环绕", desc: "围绕主体", icon: "🔄" },
];

const lightingOptions = [
  { value: "natural", label: "自然光", desc: "柔和自然", icon: "☀️" },
  { value: "soft", label: "柔光", desc: "均匀柔和", icon: "💡" },
  { value: "hard", label: "硬光", desc: "强烈对比", icon: "⚡" },
  { value: "backlight", label: "逆光", desc: "轮廓光", icon: "🌅" },
  { value: "side_light", label: "侧光", desc: "戏剧效果", icon: "🌗" },
  { value: "golden_hour", label: "黄金时刻", desc: "暖色调", icon: "🌇" },
  { value: "neon", label: "霓虹", desc: "赛博朋克", icon: "💜" },
  { value: "dark", label: "暗调", desc: "悬疑氛围", icon: "🌑" },
];

const moodOptions = [
  { value: "happy", label: "欢快", desc: "轻松愉悦", icon: "😊" },
  { value: "sad", label: "悲伤", desc: "低落情绪", icon: "😢" },
  { value: "tense", label: "紧张", desc: "悬疑冲突", icon: "😰" },
  { value: "romantic", label: "浪漫", desc: "甜蜜暧昧", icon: "💕" },
  { value: "mysterious", label: "神秘", desc: "未知探索", icon: "🔮" },
  { value: "epic", label: "史诗", desc: "宏大震撼", icon: "⚔️" },
  { value: "peaceful", label: "宁静", desc: "平和安详", icon: "🕊️" },
  { value: "angry", label: "愤怒", desc: "激烈对抗", icon: "😡" },
];

interface ShotParams {
  shotSize?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  lighting?: string;
  mood?: string;
  intensity?: number;
  speed?: number;
  [key: string]: any;
}

export function DirectorConsole({ projectId, shots, isOpen, onClose }: DirectorConsoleProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [params, setParams] = useState<ShotParams>({});

  const currentShot = shots[currentIndex];

  useEffect(() => {
    if (currentShot) {
      const shotParams = (currentShot.params as ShotParams) || {};
      setParams({
        shotSize: shotParams.shotSize || "medium",
        cameraAngle: shotParams.cameraAngle || "eye_level",
        cameraMovement: shotParams.cameraMovement || "static",
        lighting: shotParams.lighting || "natural",
        mood: shotParams.mood || "happy",
        intensity: shotParams.intensity || 50,
        speed: shotParams.speed || 50,
      });
    }
  }, [currentShot?.id]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateShotDto) =>
      storyboardApi.updateShot(projectId, currentShot.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("参数已保存");
    },
    onError: (error: any) => {
      toast.error("保存失败", error?.response?.data?.message || error?.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(params);
  };

  const handleAutoGenerate = () => {
    const total = shots.length;
    const autoParams: ShotParams = {
      shotSize: currentIndex === 0 ? "long" : currentIndex < total / 2 ? "medium" : "close",
      cameraAngle: currentIndex % 3 === 0 ? "eye_level" : currentIndex % 3 === 1 ? "low_angle" : "high_angle",
      cameraMovement: currentIndex === 0 ? "dolly_in" : currentIndex === total - 1 ? "dolly_out" : "static",
      lighting: currentIndex < total / 2 ? "natural" : "golden_hour",
      mood: currentIndex < total / 3 ? "happy" : currentIndex < total * 2 / 3 ? "tense" : "epic",
      intensity: 50,
      speed: 50,
    };
    setParams(autoParams);
    toast.info("已自动生成参数", "点击保存以应用");
  };

  const goToNext = () => {
    if (currentIndex < shots.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const goToPrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const renderSelectGrid = (
    label: string,
    options: Array<{ value: string; label: string; desc: string; icon: string }>,
    value: string | undefined,
    onChange: (value: string) => void
  ) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-text-secondary">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`p-2 rounded-lg border text-left transition-all ${
              value === opt.value
                ? "border-anime-purple bg-anime-purple/10"
                : "border-divider bg-panel-mid hover:border-anime-purple/50"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{opt.icon}</span>
              <span className="text-xs font-medium text-white">{opt.label}</span>
            </div>
            <p className="text-[10px] text-text-secondary mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  if (!isOpen || shots.length === 0) return null;

  return (
    <AnimatePresence>
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
          className="w-full max-w-6xl max-h-[90vh] bg-panel-deep border border-divider rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-divider">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white">导演控制台</h3>
                <p className="text-xs text-text-secondary">逐镜头精细控制摄影参数</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel-mid border border-divider">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="text-text-secondary hover:text-white disabled:opacity-30">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-sm font-mono text-white min-w-[60px] text-center">{currentIndex + 1} / {shots.length}</span>
                <button onClick={goToNext} disabled={currentIndex === shots.length - 1} className="text-text-secondary hover:text-white disabled:opacity-30">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAutoGenerate}>自动推荐</Button>
              <Button size="sm" onClick={handleSave} isLoading={updateMutation.isPending}>保存参数</Button>
              <button onClick={onClose} className="text-text-secondary hover:text-white ml-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Shot Preview */}
              <div className="space-y-4">
                <div className="aspect-[3/4] rounded-xl bg-panel-mid border border-divider overflow-hidden">
                  {currentShot.imageUrl ? (
                    <img src={currentShot.imageUrl} alt={`Shot ${currentShot.sequence}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <svg className="w-16 h-16 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                      <p className="text-sm text-text-disabled">暂无预览图</p>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-panel-mid border border-divider">
                  <p className="text-sm font-medium text-white mb-1">分镜 {currentShot.sequence}</p>
                  <p className="text-xs text-text-secondary line-clamp-3">{currentShot.prompt || "暂无提示词"}</p>
                  {(currentShot.params as any)?.dialogue && <p className="text-xs text-anime-purple mt-2">「{(currentShot.params as any).dialogue}」</p>}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {shots.map((shot, index) => (
                    <button key={shot.id} onClick={() => setCurrentIndex(index)} className={`p-2 rounded-lg border text-center transition-all ${currentIndex === index ? "border-anime-purple bg-anime-purple/10" : "border-divider bg-panel-mid hover:border-anime-purple/50"}`}>
                      <span className="text-xs font-mono text-text-secondary">#{shot.sequence}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Parameters */}
              <div className="space-y-4">
                {renderSelectGrid("景别", shotSizeOptions, params.shotSize, (v) => setParams({ ...params, shotSize: v }))}
                {renderSelectGrid("镜头角度", cameraAngleOptions, params.cameraAngle, (v) => setParams({ ...params, cameraAngle: v }))}
                {renderSelectGrid("运镜方式", cameraMovementOptions, params.cameraMovement, (v) => setParams({ ...params, cameraMovement: v }))}
                {renderSelectGrid("光影", lightingOptions, params.lighting, (v) => setParams({ ...params, lighting: v }))}
                {renderSelectGrid("情绪氛围", moodOptions, params.mood, (v) => setParams({ ...params, mood: v }))}

                <div className="p-4 rounded-xl bg-panel-mid border border-divider space-y-4">
                  <h4 className="text-sm font-medium text-white">动画参数</h4>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">运动强度：{params.intensity}%</label>
                    <input type="range" min="0" max="100" value={params.intensity || 50} onChange={(e) => setParams({ ...params, intensity: parseInt(e.target.value) })} className="w-full accent-anime-purple" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">运动速度：{params.speed}%</label>
                    <input type="range" min="0" max="100" value={params.speed || 50} onChange={(e) => setParams({ ...params, speed: parseInt(e.target.value) })} className="w-full accent-anime-purple" />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-400">💡 提示：修改参数后点击「保存参数」应用更改。使用「自动推荐」可根据镜头位置智能生成参数。</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
