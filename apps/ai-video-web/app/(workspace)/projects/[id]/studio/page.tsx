"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PlayIcon,
  ImageIcon,
  WandIcon,
  UserIcon,
  PlusIcon,
  XIcon,
  LockIcon,
  SparklesIcon,
} from "@/components/icons";
import {
  projectsApi,
  storyboardApi,
  ShotPreview,
  charactersApi,
  CreateCharacterDto,
  LOCK_LEVELS,
} from "@/lib/api";
import Link from "next/link";
import { BackButton } from "@/components/navigation/back-button";

const tabs = [
  { id: "characters", label: "角色", icon: UserIcon },
  { id: "story", label: "故事" },
  { id: "storyboard", label: "分镜" },
  { id: "timeline", label: "时间轴" },
];
const shotTypes = ["特写", "近景", "中景", "全景", "远景"];
const cameraAngles = ["平视", "俯拍", "仰拍", "跟拍", "固定"];

export default function StudioPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("story");
  const [prompt, setPrompt] = useState("");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const [showLockLevelModal, setShowLockLevelModal] = useState(false);
  const [newCharacter, setNewCharacter] = useState<CreateCharacterDto>({
    name: "",
    lockLevel: "medium",
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.getProject(projectId),
  });
  const { data: storyboard } = useQuery({
    queryKey: ["storyboard", projectId],
    queryFn: () => storyboardApi.getStoryboard(projectId),
  });
  const { data: characters } = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => charactersApi.listCharacters(projectId),
  });

  const generateMutation = useMutation({
    mutationFn: (data: { prompt: string }) =>
      storyboardApi.generate(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
    },
  });
  const previewMutation = useMutation({
    mutationFn: (shotId: string) =>
      storyboardApi.previewShot(projectId, shotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
    },
  });
  const deleteShotMutation = useMutation({
    mutationFn: (shotId: string) => storyboardApi.deleteShot(projectId, shotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
    },
  });

  const createCharacterMutation = useMutation({
    mutationFn: (data: CreateCharacterDto) =>
      charactersApi.createCharacter(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
      setShowCreateCharacter(false);
      setNewCharacter({ name: "", lockLevel: "medium" });
    },
  });
  const updateLockLevelMutation = useMutation({
    mutationFn: (lockLevel: "loose" | "medium" | "strict") =>
      charactersApi.updateLockLevel(projectId, selectedCharacterId!, lockLevel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", projectId] });
      setShowLockLevelModal(false);
    },
  });

  const shots = storyboard?.shots || [];
  const selectedShot = shots.find((s) => s.id === selectedShotId) || null;
  const selectedCharacter =
    characters?.find((c) => c.id === selectedCharacterId) || null;

  const getLockLevelStyle = (lockLevel: string) => {
    switch (lockLevel) {
      case "strict":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "loose":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getLockLevelLabel = (lockLevel: string) => {
    return LOCK_LEVELS.find((l) => l.key === lockLevel)?.label || lockLevel;
  };

  return (
    <div className="h-screen flex flex-col bg-cinema">
      <header className="h-16 border-b border-divider bg-panel-deep flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <BackButton href="/projects" label="项目列表" />
          <div className="w-px h-6 bg-divider" />
          <h1 className="font-display text-lg font-semibold text-white">
            {project?.name || "加载中..."}
          </h1>
          {project?.status && (
            <Badge
              variant={project.status === "draft" ? "info" : "success"}
              className="ml-2"
            >
              {project.status === "draft" ? "草稿" : "进行中"}
            </Badge>
          )}
        </div>
        <div className="flex gap-3">
          <Link href={`/projects/${projectId}/generate`}>
            <Button variant="outline" size="sm" className="gap-2">
              <WandIcon className="w-4 h-4" />
              生成视频
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/export`}>
            <Button variant="outline" size="sm" className="gap-2">
              <PlayIcon className="w-4 h-4" />
              导出
            </Button>
          </Link>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <nav className="w-48 border-r border-divider bg-panel-deep p-4 space-y-1 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === tab.id ? "bg-anime-purple/10 text-anime-purple font-medium border border-anime-purple/20" : "text-text-secondary hover:bg-panel-mid hover:text-white"}`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "characters" && (
            <div className="flex gap-6 h-full">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl font-bold text-white">
                    角色管理
                  </h2>
                  <Button
                    onClick={() => setShowCreateCharacter(true)}
                    className="gap-2"
                  >
                    <PlusIcon className="w-4 h-4" /> 创建角色
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {characters?.map((character) => (
                    <motion.div
                      key={character.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedCharacterId(character.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedCharacterId === character.id ? "border-anime-purple bg-anime-purple/5" : "border-divider bg-panel-mid hover:border-anime-purple/50"}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-anime-purple/20 to-panel-deep flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-anime-purple" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">
                              {character.name}
                            </h3>
                            <p className="text-xs text-text-secondary">
                              {character.gender || ""}{" "}
                              {character.age ? `${character.age}岁` : ""}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getLockLevelStyle(character.lockLevel)} text-xs`}
                        >
                          <LockIcon className="w-3 h-3 mr-1" />
                          {getLockLevelLabel(character.lockLevel)}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {character.appearance || "暂无描述"}
                      </p>
                      {character.variants && character.variants.length > 0 && (
                        <div className="mt-3 flex gap-2">
                          {character.variants.slice(0, 3).map((v, i) => (
                            <div
                              key={i}
                              className="w-8 h-8 rounded-lg bg-panel-deep overflow-hidden"
                            >
                              <img
                                src={v.imageUrl}
                                alt={v.type}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {character.variants.length > 3 && (
                            <div className="w-8 h-8 rounded-lg bg-panel-deep flex items-center justify-center text-xs text-text-secondary">
                              +{character.variants.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {!characters ||
                    (characters.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <UserIcon className="w-12 h-12 text-text-disabled mx-auto mb-4" />
                        <p className="text-text-secondary">
                          暂无角色，点击上方按钮创建
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {selectedCharacter && (
                <div className="w-80 flex-shrink-0 border-l border-divider bg-panel-deep p-4 overflow-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-semibold text-white">
                      {selectedCharacter.name}
                    </h3>
                    <button
                      onClick={() => setSelectedCharacterId(null)}
                      className="text-text-secondary hover:text-white"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        性别
                      </label>
                      <p className="text-sm text-white">
                        {selectedCharacter.gender || "未设置"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        年龄
                      </label>
                      <p className="text-sm text-white">
                        {selectedCharacter.age || "未设置"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        身份
                      </label>
                      <p className="text-sm text-white">
                        {selectedCharacter.role || "未设置"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        外貌描述
                      </label>
                      <p className="text-sm text-white">
                        {selectedCharacter.appearance || "未设置"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        服装
                      </label>
                      <p className="text-sm text-white">
                        {selectedCharacter.outfit || "未设置"}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-divider">
                      <label className="block text-xs text-text-secondary mb-2 flex items-center gap-2">
                        <LockIcon className="w-3 h-3" />
                        角色锁定强度
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLockLevelModal(true)}
                        className={`w-full ${getLockLevelStyle(selectedCharacter.lockLevel)}`}
                      >
                        {getLockLevelLabel(selectedCharacter.lockLevel)} -{" "}
                        {
                          LOCK_LEVELS.find(
                            (l) => l.key === selectedCharacter.lockLevel,
                          )?.description
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "story" && (
            <div className="max-w-3xl">
              <h2 className="font-display text-2xl font-bold text-white mb-6">
                故事编排
              </h2>
              <Textarea
                placeholder="输入你的故事或剧情描述..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px] mb-4"
              />
              <Button
                onClick={() => {
                  if (prompt.trim()) generateMutation.mutate({ prompt });
                }}
                isLoading={generateMutation.isPending}
                disabled={!prompt.trim()}
                className="gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                {generateMutation.isPending ? "生成中..." : "生成分镜"}
              </Button>
            </div>
          )}
          {activeTab === "storyboard" && (
            <div className="flex gap-6 h-full">
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold text-white">
                  分镜编辑
                </h2>
                <p className="text-text-secondary text-sm mb-4">
                  {shots.length} 个分镜
                </p>
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                  {shots.map((shot) => (
                    <motion.div
                      key={shot.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${selectedShotId === shot.id ? "border-anime-purple" : "border-divider hover:border-anime-purple/50"}`}
                      onClick={() => setSelectedShotId(shot.id)}
                    >
                      <div className="aspect-[3/4] bg-gradient-to-br from-anime-purple/10 to-panel-mid flex items-center justify-center relative">
                        {shot.imageUrl ? (
                          <img
                            src={shot.imageUrl}
                            alt={`Shot ${shot.sequence}`}
                            className="w-full h-full object-cover"
                          />
                        ) : shot.status === "generating" ? (
                          <div className="w-8 h-8 rounded-full border-2 border-anime-purple border-t-transparent animate-spin" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-text-disabled" />
                        )}
                        <Badge
                          className="absolute top-2 right-2 text-[10px]"
                          variant={
                            shot.status === "completed"
                              ? "success"
                              : shot.status === "generating"
                                ? "warning"
                                : shot.status === "failed"
                                  ? "error"
                                  : "info"
                          }
                        >
                          {shot.status === "completed"
                            ? "已完成"
                            : shot.status === "generating"
                              ? "生成中"
                              : shot.status === "failed"
                                ? "失败"
                                : "待生成"}
                        </Badge>
                      </div>
                      <div className="p-2 bg-panel-mid">
                        <p className="text-sm font-medium text-white truncate">
                          {shot.prompt?.substring(0, 20) ||
                            `分镜 ${shot.sequence}`}
                        </p>
                        <p className="text-xs text-text-disabled">
                          #{shot.sequence}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              {selectedShot && (
                <div className="w-80 flex-shrink-0 border-l border-divider bg-panel-deep p-4 overflow-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-semibold text-white">
                      分镜 {selectedShot.sequence}
                    </h3>
                    <button
                      onClick={() => {
                        if (confirm("确认删除此分镜？"))
                          deleteShotMutation.mutate(selectedShot.id);
                        setSelectedShotId(null);
                      }}
                      className="text-xs text-warm-orange hover:underline"
                    >
                      删除
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        提示词
                      </label>
                      <Textarea
                        value={selectedShot.prompt}
                        readOnly
                        className="text-xs h-20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          景别
                        </label>
                        <select
                          className="w-full h-9 rounded-lg border border-divider bg-panel-mid px-2 text-sm text-white"
                          defaultValue={selectedShot.shotType || "中景"}
                        >
                          {shotTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          角度
                        </label>
                        <select
                          className="w-full h-9 rounded-lg border border-divider bg-panel-mid px-2 text-sm text-white"
                          defaultValue={selectedShot.cameraAngle || "平视"}
                        >
                          {cameraAngles.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2 mt-2"
                      onClick={() => previewMutation.mutate(selectedShot.id)}
                      isLoading={previewMutation.isPending}
                    >
                      <ImageIcon className="w-4 h-4" />
                      生成预览
                    </Button>
                    {previewMutation.isSuccess && selectedShot.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={selectedShot.imageUrl}
                          alt="Preview"
                          className="rounded-lg w-full"
                        />
                        {(selectedShot as ShotPreview).characterPrompt && (
                          <p className="text-xs text-text-secondary mt-2">
                            {(selectedShot as ShotPreview).characterPrompt}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "timeline" && (
            <div className="max-w-4xl">
              <h2 className="font-display text-2xl font-bold text-white mb-6">
                时间轴与音频
              </h2>
              {shots.length === 0 ? (
                <p className="text-text-secondary">暂无分镜</p>
              ) : (
                <div className="space-y-2">
                  {shots.map((shot) => (
                    <div
                      key={shot.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-panel-mid border border-divider"
                    >
                      <span className="text-xs text-text-disabled font-mono w-8">
                        #{shot.sequence}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          {shot.prompt?.substring(0, 40) ||
                            `分镜 ${shot.sequence}`}
                        </p>
                      </div>
                      <span className="text-xs text-text-disabled">
                        {shot.duration || "0"}s
                      </span>
                      <PlayIcon className="w-4 h-4 text-text-secondary" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateCharacter && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-panel-deep rounded-xl p-6 w-full max-w-md border border-divider">
            <h3 className="font-display text-xl font-bold text-white mb-4">
              创建角色
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  角色名称
                </label>
                <Input
                  placeholder="输入角色名称"
                  value={newCharacter.name}
                  onChange={(e) =>
                    setNewCharacter({ ...newCharacter, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  性别
                </label>
                <Input
                  placeholder="如：男、女"
                  value={newCharacter.gender || ""}
                  onChange={(e) =>
                    setNewCharacter({ ...newCharacter, gender: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  年龄
                </label>
                <Input
                  type="number"
                  placeholder="输入年龄"
                  value={newCharacter.age || ""}
                  onChange={(e) =>
                    setNewCharacter({
                      ...newCharacter,
                      age: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  外貌描述
                </label>
                <Textarea
                  placeholder="描述角色的外貌特征..."
                  value={newCharacter.appearance || ""}
                  onChange={(e) =>
                    setNewCharacter({
                      ...newCharacter,
                      appearance: e.target.value,
                    })
                  }
                  className="h-24"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-2">
                  角色锁定强度
                </label>
                <div className="flex gap-2">
                  {LOCK_LEVELS.map((level) => (
                    <button
                      key={level.key}
                      onClick={() =>
                        setNewCharacter({
                          ...newCharacter,
                          lockLevel: level.key as "loose" | "medium" | "strict",
                        })
                      }
                      className={`flex-1 py-2 px-3 rounded-lg text-xs border transition-colors ${newCharacter.lockLevel === level.key ? getLockLevelStyle(level.key) + " border-current" : "border-divider bg-panel-mid text-text-secondary hover:border-white/30"}`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateCharacter(false);
                  setNewCharacter({ name: "", lockLevel: "medium" });
                }}
              >
                取消
              </Button>
              <Button
                onClick={() => createCharacterMutation.mutate(newCharacter)}
                disabled={!newCharacter.name.trim()}
                isLoading={createCharacterMutation.isPending}
              >
                创建
              </Button>
            </div>
          </div>
        </div>
      )}

      {showLockLevelModal && selectedCharacter && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-panel-deep rounded-xl p-6 w-full max-w-md border border-divider">
            <div className="flex items-center gap-3 mb-4">
              <LockIcon className="w-5 h-5 text-anime-purple" />
              <h3 className="font-display text-xl font-bold text-white">
                设置角色锁定强度
              </h3>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              为「{selectedCharacter.name}
              」选择锁定强度，影响AI生成时角色形象的一致性
            </p>

            <div className="space-y-3">
              {LOCK_LEVELS.map((level) => (
                <button
                  key={level.key}
                  onClick={() =>
                    updateLockLevelMutation.mutate(
                      level.key as "loose" | "medium" | "strict",
                    )
                  }
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedCharacter.lockLevel === level.key ? getLockLevelStyle(level.key) + " border-current" : "border-divider hover:border-white/30"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">
                      {level.label}
                    </span>
                    {selectedCharacter.lockLevel === level.key && (
                      <Badge variant="default" className="text-xs">
                        当前
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {level.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowLockLevelModal(false)}
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
    </svg>
  );
}
