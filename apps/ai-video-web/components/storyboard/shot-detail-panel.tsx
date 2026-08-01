"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Shot, UpdateShotDto } from "@/lib/api";
import { ShotCharacterBinding } from "./shot-character-binding";

interface ShotDetailPanelProps {
  shot: Shot;
  projectId: string;
  onUpdate: (data: UpdateShotDto) => void;
  onDelete: () => void;
  onGeneratePreview: () => void;
  isGeneratingPreview: boolean;
  onClose: () => void;
}

const shotTypeOptions = [
  { value: "特写", label: "特写", desc: "突出表情细节" },
  { value: "近景", label: "近景", desc: "胸部以上" },
  { value: "中景", label: "中景", desc: "膝盖以上" },
  { value: "全景", label: "全景", desc: "完整人物" },
  { value: "远景", label: "远景", desc: "环境氛围" },
];

const cameraAngleOptions = [
  { value: "平视", label: "平视", desc: "自然视角" },
  { value: "俯拍", label: "俯拍", desc: "从上向下" },
  { value: "仰拍", label: "仰拍", desc: "从下向上" },
  { value: "跟拍", label: "跟拍", desc: "跟随主体" },
  { value: "固定", label: "固定", desc: "静止机位" },
];

const cameraMovementOptions = [
  { value: "static", label: "静止", desc: "固定画面" },
  { value: "push_in", label: "推镜", desc: "镜头推进" },
  { value: "pull_out", label: "拉镜", desc: "镜头拉远" },
  { value: "pan", label: "摇镜", desc: "水平移动" },
  { value: "follow", label: "跟随", desc: "跟随角色" },
  { value: "orbit", label: "环绕", desc: "围绕主体" },
];

const lightingOptions = [
  { value: "soft_light", label: "柔光", desc: "温和自然" },
  { value: "backlight", label: "逆光", desc: "轮廓光" },
  { value: "side_light", label: "侧光", desc: "戏剧性" },
  { value: "golden_hour", label: "黄金时刻", desc: "暖色调" },
  { value: "blue_hour", label: "蓝调时刻", desc: "冷色调" },
  { value: "neon", label: "霓虹", desc: "赛博感" },
  { value: "dark", label: "暗光", desc: "悬疑氛围" },
];

const moodOptions = [
  { value: "tense", label: "紧张", desc: "悬疑冲突" },
  { value: "warm", label: "温暖", desc: "治愈轻松" },
  { value: "sad", label: "悲伤", desc: "低落情绪" },
  { value: "romantic", label: "浪漫", desc: "甜蜜暧昧" },
  { value: "mysterious", label: "神秘", desc: "未知探索" },
  { value: "cheerful", label: "欢快", desc: "喜剧节奏" },
  { value: "epic", label: "史诗", desc: "宏大震撼" },
];

export function ShotDetailPanel({
  shot,
  projectId,
  onUpdate,
  onDelete,
  onGeneratePreview,
  isGeneratingPreview,
  onClose,
}: ShotDetailPanelProps) {
  const params = useMemo(() => shot.params || {}, [shot.params]);
  const camera = useMemo(() => params.camera || {}, [params.camera]);

  const buildFormFromShot = () => ({
    title: params.title || `分镜 ${shot.sequence}`,
    description: params.description || "",
    prompt: shot.prompt || "",
    negativePrompt: shot.negativePrompt || "",
    duration: shot.duration || 3000,
    shotType: shot.shotType || camera.shotSize || params.shotType || "中景",
    cameraAngle: shot.cameraAngle || camera.angle || params.cameraAngle || "平视",
    cameraMovement: camera.movement || params.cameraMovement || "static",
    emotion: params.emotion || camera.mood || "",
    lighting: camera.lighting || params.lighting || "soft_light",
    dialogue: params.dialogue || "",
    narration: params.narration || "",
    subtitle: params.subtitle || "",
  });

  const [form, setForm] = useState<UpdateShotDto>(buildFormFromShot);

  // 只在切换分镜时重置表单，避免 refetch 导致闪烁
  useEffect(() => {
    setForm(buildFormFromShot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot.id]);

  const handleChange = (field: keyof UpdateShotDto, value: string | number | string[] | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const hasChanges = JSON.stringify(form) !== JSON.stringify({
    title: params.title || `分镜 ${shot.sequence}`,
    description: params.description || "",
    prompt: shot.prompt || "",
    negativePrompt: shot.negativePrompt || "",
    duration: shot.duration || 3000,
    shotType: shot.shotType || camera.shotSize || params.shotType || "中景",
    cameraAngle: shot.cameraAngle || camera.angle || params.cameraAngle || "平视",
    cameraMovement: camera.movement || params.cameraMovement || "static",
    emotion: params.emotion || camera.mood || "",
    lighting: camera.lighting || params.lighting || "soft_light",
    dialogue: params.dialogue || "",
    narration: params.narration || "",
    subtitle: params.subtitle || "",
  });

  // Auto-save with debounce
  useEffect(() => {
    if (!hasChanges) return;
    const timer = setTimeout(() => {
      onUpdate(form);
    }, 1500);
    return () => clearTimeout(timer);
  }, [form, hasChanges, onUpdate]);

  const renderSelectGrid = (
    label: string,
    options: Array<{ value: string; label: string; desc: string }>,
    value: string,
    onChange: (value: string) => void
  ) => (
    <div className="space-y-2">
      <label className="block text-xs text-text-secondary">{label}</label>
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
            <p className="text-xs font-medium text-white">{opt.label}</p>
            <p className="text-[10px] text-text-secondary">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-96 flex-shrink-0 border-l border-divider bg-panel-deep p-4 overflow-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-white">分镜 {shot.sequence}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Character Binding */}
        <ShotCharacterBinding
          projectId={projectId}
          selectedCharacterIds={params.characterIds || []}
          onChange={(characterIds) => {
            onUpdate({ characterIds });
          }}
        />

        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">分镜标题</label>
            <Input
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">画面描述</label>
            <Textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="text-xs h-20"
              placeholder="描述这个分镜的画面内容..."
            />
          </div>
        </div>

        {/* Camera Language */}
        <div className="p-3 rounded-lg bg-panel-mid/50 border border-divider space-y-3">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-anime-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            镜头语言
          </h4>
          {renderSelectGrid("景别", shotTypeOptions, form.shotType || "中景", (v) => handleChange("shotType", v))}
          {renderSelectGrid("镜头角度", cameraAngleOptions, form.cameraAngle || "平视", (v) => handleChange("cameraAngle", v))}
          {renderSelectGrid("运镜方式", cameraMovementOptions, form.cameraMovement || "static", (v) => handleChange("cameraMovement", v))}
        </div>

        {/* Lighting & Mood */}
        <div className="p-3 rounded-lg bg-panel-mid/50 border border-divider space-y-3">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-warm-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            光影与情绪
          </h4>
          {renderSelectGrid("光影", lightingOptions, form.lighting || "soft_light", (v) => handleChange("lighting", v))}
          {renderSelectGrid("情绪", moodOptions, form.emotion || "warm", (v) => handleChange("emotion", v))}
        </div>

        {/* Prompts */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">英文提示词</label>
            <Textarea
              value={form.prompt}
              onChange={(e) => handleChange("prompt", e.target.value)}
              className="text-xs h-24"
              placeholder="用于 AI 图像/视频生成的英文提示词..."
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">负面提示词</label>
            <Textarea
              value={form.negativePrompt}
              onChange={(e) => handleChange("negativePrompt", e.target.value)}
              className="text-xs h-16"
              placeholder="不希望出现的内容..."
            />
          </div>
        </div>

        {/* Audio / Subtitle */}
        <div className="p-3 rounded-lg bg-panel-mid/50 border border-divider space-y-3">
          <h4 className="text-sm font-medium text-white">台词与字幕</h4>
          <div>
            <label className="block text-xs text-text-secondary mb-1">台词</label>
            <Textarea
              value={form.dialogue}
              onChange={(e) => handleChange("dialogue", e.target.value)}
              className="text-xs h-16"
              placeholder="角色台词..."
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">旁白</label>
            <Textarea
              value={form.narration}
              onChange={(e) => handleChange("narration", e.target.value)}
              className="text-xs h-16"
              placeholder="旁白内容..."
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">字幕</label>
            <Textarea
              value={form.subtitle}
              onChange={(e) => handleChange("subtitle", e.target.value)}
              className="text-xs h-16"
              placeholder="显示的字幕..."
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            时长：{(form.duration || 3000) / 1000} 秒
          </label>
          <input
            type="range"
            min="1000"
            max="10000"
            step="500"
            value={form.duration || 3000}
            onChange={(e) => handleChange("duration", parseInt(e.target.value))}
            className="w-full accent-anime-purple"
          />
          <div className="flex justify-between text-[10px] text-text-secondary">
            <span>1s</span>
            <span>10s</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={onGeneratePreview}
            isLoading={isGeneratingPreview}
          >
            <ImageIcon className="w-4 h-4" />
            {isGeneratingPreview ? "生成中..." : "生成预览"}
          </Button>
          {hasChanges && (
            <p className="text-[10px] text-anime-purple text-center">自动保存中...</p>
          )}
          <Button size="sm" variant="secondary" className="w-full text-warm-orange" onClick={onDelete}>
            删除分镜
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
