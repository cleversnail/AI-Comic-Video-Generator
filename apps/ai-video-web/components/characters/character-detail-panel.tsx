"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Character, CharacterVariant, VariantType, charactersApi } from "@/lib/api";

interface CharacterDetailPanelProps {
  character: Character;
  projectId: string;
  onClose: () => void;
}

const lockLevelOptions = [
  { value: "loose", label: "宽松", description: "允许较大变化，适合创意探索", icon: "🎨" },
  { value: "medium", label: "中等", description: "保持基本特征，平衡一致性与多样性", icon: "⚖️" },
  { value: "strict", label: "严格", description: "高度一致，适合连续剧情", icon: "🔒" },
];

const viewLabels: Record<string, string> = {
  front: "正面",
  three_quarter: "四分之三侧",
  side: "侧面",
  back: "背面",
};

export function CharacterDetailPanel({ character, projectId, onClose }: CharacterDetailPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "views" | "variants" | "lock">("info");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Fetch variant types
  const { data: variantTypes = [] } = useQuery({
    queryKey: ["variantTypes"],
    queryFn: () => charactersApi.getVariantTypes(),
  });

  // Update character mutation
  const updateMutation = useMutation({
    mutationFn: (data: { field: string; value: any }) =>
      charactersApi.updateCharacter(projectId, character.id, { [data.field]: data.value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
      setEditingField(null);
    },
  });

  // Generate views mutation
  const generateViewsMutation = useMutation({
    mutationFn: () => charactersApi.generateViews(projectId, character.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
    },
  });

  // Clear views mutation
  const clearViewsMutation = useMutation({
    mutationFn: () => charactersApi.clearViews(projectId, character.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
    },
  });

  // Generate variant mutation
  const generateVariantMutation = useMutation({
    mutationFn: (variantType: string) =>
      charactersApi.generateVariant(projectId, character.id, variantType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
    },
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) =>
      charactersApi.deleteVariant(projectId, character.id, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
    },
  });

  // Update lock level mutation
  const updateLockLevelMutation = useMutation({
    mutationFn: (lockLevel: string) =>
      charactersApi.updateCharacter(projectId, character.id, { lockLevel: lockLevel as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
    },
  });

  const handleSaveField = (field: string) => {
    updateMutation.mutate({ field, value: editValue });
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

  const viewImages = character.viewImages || {};
  const hasViews = Object.values(viewImages).some(Boolean);
  const variants = character.variants || [];

  // Group variant types by category
  const variantTypesByCategory = variantTypes.reduce((acc, vt) => {
    if (!acc[vt.category]) acc[vt.category] = [];
    acc[vt.category].push(vt);
    return acc;
  }, {} as Record<string, VariantType[]>);

  const tabs = [
    { id: "info", label: "基本信息", icon: "📝" },
    { id: "views", label: "四视图", icon: "👁️", badge: hasViews ? "已生成" : undefined },
    { id: "variants", label: "变体", icon: "🎭", badge: variants.length > 0 ? `${variants.length}` : undefined },
    { id: "lock", label: "锁定强度", icon: "🔐" },
  ];

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-96 flex-shrink-0 border-l border-divider bg-panel-deep overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-divider flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-white">{character.name}</h3>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-divider">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-3 text-sm transition-colors relative ${
              activeTab === tab.id
                ? "text-anime-purple border-b-2 border-anime-purple"
                : "text-text-secondary hover:text-white"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden lg:inline">{tab.label}</span>
            {tab.badge && (
              <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-anime-purple/20 text-anime-purple">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {/* Info Tab */}
          {activeTab === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Name */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">角色名称</label>
                {editingField === "name" ? (
                  <div className="flex gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => handleSaveField("name")}>保存</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingField(null)}>取消</Button>
                  </div>
                ) : (
                  <div
                    className="p-2 rounded-lg bg-panel-mid cursor-pointer hover:bg-panel-mid/80"
                    onClick={() => startEditing("name", character.name)}
                  >
                    {character.name || "点击编辑"}
                  </div>
                )}
              </div>

              {/* Gender & Age */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">性别</label>
                  {editingField === "gender" ? (
                    <div className="flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleSaveField("gender")}>保存</Button>
                    </div>
                  ) : (
                    <div
                      className="p-2 rounded-lg bg-panel-mid cursor-pointer hover:bg-panel-mid/80"
                      onClick={() => startEditing("gender", character.gender || "")}
                    >
                      {character.gender || "点击编辑"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">年龄</label>
                  {editingField === "age" ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleSaveField("age")}>保存</Button>
                    </div>
                  ) : (
                    <div
                      className="p-2 rounded-lg bg-panel-mid cursor-pointer hover:bg-panel-mid/80"
                      onClick={() => startEditing("age", character.age?.toString() || "")}
                    >
                      {character.age ? `${character.age}岁` : "点击编辑"}
                    </div>
                  )}
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">角色定位</label>
                {editingField === "role" ? (
                  <div className="flex gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1"
                      placeholder="主角/配角/反派等"
                    />
                    <Button size="sm" onClick={() => handleSaveField("role")}>保存</Button>
                  </div>
                ) : (
                  <div
                    className="p-2 rounded-lg bg-panel-mid cursor-pointer hover:bg-panel-mid/80"
                    onClick={() => startEditing("role", character.role || "")}
                  >
                    {character.role ? (
                      <Badge variant="default">{character.role}</Badge>
                    ) : (
                      "点击编辑"
                    )}
                  </div>
                )}
              </div>

              {/* Appearance */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">外貌描述</label>
                {editingField === "appearance" ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="min-h-[80px]"
                      placeholder="描述角色的外貌特征..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveField("appearance")}>保存</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingField(null)}>取消</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-2 rounded-lg bg-panel-mid cursor-pointer hover:bg-panel-mid/80 min-h-[60px]"
                    onClick={() => startEditing("appearance", character.appearance || "")}
                  >
                    {character.appearance || "点击编辑外貌描述..."}
                  </div>
                )}
              </div>

              {/* Outfit */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">服装描述</label>
                {editingField === "outfit" ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="min-h-[80px]"
                      placeholder="描述角色的服装风格..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveField("outfit")}>保存</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingField(null)}>取消</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-2 rounded-lg bg-panel-mid cursor-pointer hover:bg-panel-mid/80 min-h-[60px]"
                    onClick={() => startEditing("outfit", character.outfit || "")}
                  >
                    {character.outfit || "点击编辑服装描述..."}
                  </div>
                )}
              </div>

              {/* Personality */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">性格特点</label>
                {editingField === "personality" ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="min-h-[80px]"
                      placeholder="描述角色的性格特点..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveField("personality")}>保存</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingField(null)}>取消</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-2 rounded-lg bg-panel-mid cursor-pointer hover:bg-panel-mid/80 min-h-[60px]"
                    onClick={() => startEditing("personality", character.personality || "")}
                  >
                    {character.personality || "点击编辑性格特点..."}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Views Tab */}
          {activeTab === "views" && (
            <motion.div
              key="views"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">角色四视图确保多角度一致性</p>
                {hasViews && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => clearViewsMutation.mutate()}
                    isLoading={clearViewsMutation.isPending}
                  >
                    清除
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(viewLabels).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <label className="block text-xs text-text-secondary text-center">{label}</label>
                    <div className="aspect-square rounded-lg overflow-hidden bg-panel-mid border border-divider">
                      {viewImages[key as keyof typeof viewImages] ? (
                        <img
                          src={viewImages[key as keyof typeof viewImages]}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-disabled">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => generateViewsMutation.mutate()}
                isLoading={generateViewsMutation.isPending}
                disabled={generateViewsMutation.isPending}
              >
                {generateViewsMutation.isPending ? "生成中..." : hasViews ? "重新生成四视图" : "生成四视图"}
              </Button>

              <div className="p-3 rounded-lg bg-panel-mid/50 border border-divider">
                <p className="text-xs text-text-secondary">
                  💡 四视图包括正面、四分之三侧面、侧面和背面四个角度，用于确保角色在不同镜头中保持一致的外观。
                </p>
              </div>
            </motion.div>
          )}

          {/* Variants Tab */}
          {activeTab === "variants" && (
            <motion.div
              key="variants"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-text-secondary">为角色生成不同表情、服装和场景的变体</p>

              {/* Existing Variants */}
              {variants.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">已生成的变体</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {variants.map((variant) => (
                      <div key={variant.id} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-panel-mid border border-divider">
                          <img
                            src={variant.imageUrl}
                            alt={variant.description}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => deleteVariantMutation.mutate(variant.id)}
                            className="p-1.5 rounded-full bg-red-500/80 text-white hover:bg-red-500"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-[10px] text-text-secondary text-center mt-1 truncate">
                          {variant.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate New Variants */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white">生成新变体</h4>
                {Object.entries(variantTypesByCategory).map(([category, types]) => (
                  <div key={category} className="space-y-2">
                    <h5 className="text-xs text-text-secondary">{category}</h5>
                    <div className="flex flex-wrap gap-2">
                      {types.map((vt) => (
                        <Button
                          key={vt.value}
                          size="sm"
                          variant="outline"
                          onClick={() => generateVariantMutation.mutate(vt.value)}
                          isLoading={generateVariantMutation.isPending}
                          disabled={generateVariantMutation.isPending}
                        >
                          {vt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-panel-mid/50 border border-divider">
                <p className="text-xs text-text-secondary">
                  💡 变体系统让你快速生成角色的不同状态，用于分镜中展示角色的情绪变化、服装更换或场景转换。
                </p>
              </div>
            </motion.div>
          )}

          {/* Lock Level Tab */}
          {activeTab === "lock" && (
            <motion.div
              key="lock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-text-secondary">
                锁定强度控制角色在不同分镜中的一致性程度
              </p>

              <div className="space-y-3">
                {lockLevelOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      character.lockLevel === option.value
                        ? "border-anime-purple bg-anime-purple/10"
                        : "border-divider hover:border-anime-purple/50 bg-panel-mid"
                    }`}
                    onClick={() => updateLockLevelMutation.mutate(option.value)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">{option.label}</h4>
                          {character.lockLevel === option.value && (
                            <Badge variant="success" className="text-[10px]">当前</Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{option.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-panel-mid/50 border border-divider">
                <h4 className="text-sm font-medium text-white mb-2">锁定强度说明</h4>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li>• <strong>宽松</strong>：允许角色在不同场景中有较大变化，适合创意探索阶段</li>
                  <li>• <strong>中等</strong>：保持基本特征（发型、服装风格），允许表情和姿态变化</li>
                  <li>• <strong>严格</strong>：高度一致，适合需要强连贯性的连续剧情</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400">
                  🔒 当前锁定强度：<strong>{lockLevelOptions.find(o => o.value === (character.lockLevel || "medium"))?.label}</strong>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
