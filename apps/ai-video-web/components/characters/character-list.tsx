"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Character, CreateCharacterDto, charactersApi } from "@/lib/api";
import { CharacterCard } from "./character-card";
import { CharacterDetailPanel } from "./character-detail-panel";
import { useToast } from "@/components/ui/toast";

interface CharacterListProps {
  projectId: string;
}

export function CharacterList({ projectId }: CharacterListProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCharacter, setNewCharacter] = useState<CreateCharacterDto>({
    name: "",
    gender: "",
    age: undefined,
    role: "",
    personality: "",
    appearance: "",
    outfit: "",
    lockLevel: "medium",
  });

  // Fetch characters
  const { data: characters = [], isLoading } = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => charactersApi.listCharacters(projectId),
  });

  // Create character mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateCharacterDto) => charactersApi.createCharacter(projectId, data),
    onSuccess: (newChar) => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
      setShowCreateDialog(false);
      setNewCharacter({
        name: "",
        gender: "",
        age: undefined,
        role: "",
        personality: "",
        appearance: "",
        outfit: "",
        lockLevel: "medium",
      });
      // Select the newly created character
      setSelectedCharacter(newChar);
      toast.success("角色创建成功");
    },
    onError: (error: any) => {
      toast.error("创建失败", error?.response?.data?.message || error?.message);
    },
  });

  // Delete character mutation
  const deleteMutation = useMutation({
    mutationFn: (characterId: string) => charactersApi.deleteCharacter(projectId, characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
      setSelectedCharacter(null);
      toast.success("角色已删除");
    },
    onError: (error: any) => {
      toast.error("删除失败", error?.response?.data?.message || error?.message);
    },
  });

  const handleCreate = () => {
    if (!newCharacter.name.trim()) return;
    createMutation.mutate(newCharacter);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Character List */}
      <div className="flex-1 overflow-auto p-6 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">角色管理</h2>
            <p className="text-text-secondary text-sm mt-1">
              {characters.length} 个角色 · 点击角色查看详情
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            添加角色
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-panel-mid animate-pulse" />
            ))}
          </div>
        ) : characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-panel-mid flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="text-text-secondary mb-2">还没有角色</p>
            <p className="text-text-disabled text-sm mb-4">添加角色来开始创作你的漫剧</p>
            <Button onClick={() => setShowCreateDialog(true)}>创建第一个角色</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                isSelected={selectedCharacter?.id === character.id}
                onClick={() => setSelectedCharacter(
                  selectedCharacter?.id === character.id ? null : character
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <AnimatePresence mode="wait">
        {selectedCharacter && (
          <motion.div
            key={selectedCharacter.id}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 384, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-shrink-0 overflow-hidden border-l border-divider"
          >
            <CharacterDetailPanel
              character={selectedCharacter}
              projectId={projectId}
              onClose={() => setSelectedCharacter(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreateDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-panel-deep border border-divider rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="font-display text-xl font-bold text-white mb-4">创建新角色</h3>
              
              <div className="space-y-4 max-h-[60vh] overflow-auto">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    角色名称 <span className="text-warm-orange">*</span>
                  </label>
                  <Input
                    placeholder="例如：小明"
                    value={newCharacter.name}
                    onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                  />
                </div>

                {/* Gender & Age */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">性别</label>
                    <select
                      className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                      value={newCharacter.gender || ""}
                      onChange={(e) => setNewCharacter({ ...newCharacter, gender: e.target.value })}
                    >
                      <option value="">不指定</option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">年龄</label>
                    <Input
                      type="number"
                      placeholder="18"
                      value={newCharacter.age || ""}
                      onChange={(e) => setNewCharacter({ ...newCharacter, age: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">角色定位</label>
                  <select
                    className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                    value={newCharacter.role || ""}
                    onChange={(e) => setNewCharacter({ ...newCharacter, role: e.target.value })}
                  >
                    <option value="">不指定</option>
                    <option value="主角">主角</option>
                    <option value="配角">配角</option>
                    <option value="反派">反派</option>
                    <option value="路人">路人</option>
                  </select>
                </div>

                {/* Appearance */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">外貌描述</label>
                  <Textarea
                    placeholder="描述角色的外貌特征，如：黑色短发，大眼睛，身材高挑..."
                    value={newCharacter.appearance || ""}
                    onChange={(e) => setNewCharacter({ ...newCharacter, appearance: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Outfit */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">服装描述</label>
                  <Textarea
                    placeholder="描述角色的服装风格，如：穿着白色校服，蓝色短裙..."
                    value={newCharacter.outfit || ""}
                    onChange={(e) => setNewCharacter({ ...newCharacter, outfit: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Personality */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">性格特点</label>
                  <Textarea
                    placeholder="描述角色的性格，如：开朗活泼，喜欢帮助别人..."
                    value={newCharacter.personality || ""}
                    onChange={(e) => setNewCharacter({ ...newCharacter, personality: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Lock Level */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">锁定强度</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "loose", label: "宽松", icon: "🎨" },
                      { value: "medium", label: "中等", icon: "⚖️" },
                      { value: "strict", label: "严格", icon: "🔒" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`p-3 rounded-lg border-2 transition-all ${
                          newCharacter.lockLevel === option.value
                            ? "border-anime-purple bg-anime-purple/10"
                            : "border-divider hover:border-anime-purple/50"
                        }`}
                        onClick={() => setNewCharacter({ ...newCharacter, lockLevel: option.value as any })}
                      >
                        <span className="text-lg">{option.icon}</span>
                        <p className="text-sm mt-1">{option.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button
                  className="flex-1"
                  disabled={!newCharacter.name.trim() || createMutation.isPending}
                  isLoading={createMutation.isPending}
                  onClick={handleCreate}
                >
                  创建角色
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
