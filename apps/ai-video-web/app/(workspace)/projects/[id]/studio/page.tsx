"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlayIcon, ImageIcon, WandIcon } from "@/components/icons";
import { projectsApi, storyboardApi, modelsApi, Shot } from "@/lib/api";
import Link from "next/link";
import { BackButton } from "@/components/navigation/back-button";
import { CharacterList } from "@/components/characters/character-list";
import { ShotCharacterBinding } from "@/components/storyboard/shot-character-binding";
import { ShotDetailPanel } from "@/components/storyboard/shot-detail-panel";
import { StoryboardReader } from "@/components/storyboard/storyboard-reader";
import { StoryTimeline } from "@/components/storyboard/story-timeline";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { VersionHistory } from "@/components/version/version-history";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const tabs = [
  { id: "characters", label: "角色" },
  { id: "story", label: "故事" },
  { id: "storyboard", label: "分镜" },
  { id: "timeline", label: "时间轴" },
];

// 本地存储 key
const STORAGE_KEY_PREFIX = "studio_draft_";

export default function StudioPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "story");
  const [prompt, setPrompt] = useState("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [deleteConfirmShotId, setDeleteConfirmShotId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectStyle, setProjectStyle] = useState("");
  const [projectAspectRatio, setProjectAspectRatio] = useState("9:16");
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);

  // 恢复本地存储的草稿
  useEffect(() => {
    const storageKey = STORAGE_KEY_PREFIX + projectId;
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.prompt) setPrompt(draft.prompt);
        if (draft.selectedCharacterIds) setSelectedCharacterIds(draft.selectedCharacterIds);
        if (draft.activeTab) setActiveTab(draft.activeTab);
      } catch {
        // Ignore parse errors
      }
    }
  }, [projectId]);

  // 保存草稿到本地存储（debounce 300ms，避免频繁写入）
  useEffect(() => {
    const storageKey = STORAGE_KEY_PREFIX + projectId;
    const timer = setTimeout(() => {
      const draft = {
        prompt,
        selectedCharacterIds,
        activeTab,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    }, 300);
    return () => clearTimeout(timer);
  }, [projectId, prompt, selectedCharacterIds, activeTab]);

  // 获取 API Key 状态
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => modelsApi.listMyApiKeys(),
  });

  const hasLlmKey = apiKeys.some((k: { capability?: string }) => k.capability === "llm");
  const hasImageKey = apiKeys.some((k: { capability?: string }) => k.capability === "image");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.getProject(projectId),
  });

  // 项目加载后，同步项目信息到本地 state
  useEffect(() => {
    if (!project) return;
    if (!projectName) setProjectName(project.name);
    if (!projectStyle) setProjectStyle(project.style || "");
    setProjectAspectRatio(project.aspectRatio || "9:16");
    if (project.description && !prompt) {
      setPrompt(project.description);
    }
  }, [project]);

  // 展开模式 ESC 退出
  useEffect(() => {
    if (!isStoryExpanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsStoryExpanded(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isStoryExpanded]);

  // 项目信息变更后自动保存（debounce 500ms）
  useEffect(() => {
    if (!project || !projectName) return;
    if (
      projectName === project.name &&
      projectStyle === (project.style || "") &&
      projectAspectRatio === (project.aspectRatio || "9:16")
    ) return;
    const timer = setTimeout(() => {
      projectsApi.updateProject(projectId, {
        name: projectName,
        style: projectStyle,
        aspectRatio: projectAspectRatio,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [projectName, projectStyle, projectAspectRatio]);
  const { data: storyboard } = useQuery({
    queryKey: ["storyboard", projectId],
    queryFn: () => storyboardApi.getStoryboard(projectId),
  });
  const generateMutation = useMutation({
    mutationFn: (data: { prompt: string; characterIds?: string[] }) =>
      storyboardApi.generate(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("分镜生成成功");
    },
    onError: (error: unknown) => {
      toast.error("分镜生成失败", getApiErrorMessage(error));
    },
  });
  const previewMutation = useMutation({
    mutationFn: (shotId: string) => storyboardApi.previewShot(projectId, shotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("预览图生成成功");
    },
    onError: (error: unknown) => {
      toast.error("预览图生成失败", getApiErrorMessage(error));
    },
  });
  const deleteShotMutation = useMutation({
    mutationFn: (shotId: string) => storyboardApi.deleteShot(projectId, shotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("分镜已删除");
    },
    onError: (error: unknown) => {
      toast.error("删除失败", getApiErrorMessage(error));
    },
  });
  const updateShotMutation = useMutation({
    mutationFn: (data: { shotId: string; data: Record<string, unknown> }) =>
      storyboardApi.updateShot(projectId, data.shotId, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("分镜已更新");
    },
    onError: (error: unknown) => {
      toast.error("更新失败", getApiErrorMessage(error));
    },
  });

  const shots: Shot[] = storyboard?.shots || [];
  const selectedShot = shots.find((s) => s.id === selectedShotId) || null;

  const handleGenerateStoryboard = async () => {
    if (!prompt.trim()) return;
    // 先保存故事文本到项目 description
    try {
      await projectsApi.updateProject(projectId, { description: prompt });
    } catch {
      // 保存失败不阻断生成流程
    }
    generateMutation.mutate({
      prompt,
      characterIds: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
    });
  };

  // 全屏编辑模式
  if (isStoryExpanded) {
    return (
      <div className="h-screen flex flex-col bg-cinema">
        <header className="h-14 border-b border-divider bg-panel-deep flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsStoryExpanded(false)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              退出全屏
            </button>
            <div className="w-px h-5 bg-divider" />
            <span className="text-sm text-text-secondary">{project?.name || "编辑故事"}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-disabled">{prompt.length} 字</span>
            <Button size="sm" onClick={() => setIsStoryExpanded(false)}>
              完成
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden p-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入你的故事或剧情描述..."
            className="w-full h-full resize-none bg-transparent text-white text-base leading-relaxed focus:outline-none placeholder:text-text-disabled"
            autoFocus
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-cinema">
      {/* Header */}
      <header className="h-16 border-b border-divider bg-panel-deep flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <BackButton href="/projects" label="项目列表" />
          <div className="w-px h-6 bg-divider" />
          <h1 className="font-display text-lg font-semibold text-white">
            {project?.name || "加载中..."}
          </h1>
          {project?.status && (
            <Badge variant={project.status === "draft" ? "info" : "success"} className="ml-2">
              {project.status === "draft" ? "草稿" : "进行中"}
            </Badge>
          )}
          {/* 模型状态指示器 */}
          <Link href="/settings/models">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors ${
              hasLlmKey && hasImageKey
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                : "bg-warm-orange/10 text-warm-orange hover:bg-warm-orange/20"
            }`}>
              <div className={`w-2 h-2 rounded-full ${hasLlmKey && hasImageKey ? "bg-green-400" : "bg-warm-orange"}`} />
              <span>{hasLlmKey && hasImageKey ? "模型已配置" : "配置模型"}</span>
            </div>
          </Link>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowVersions(true)}>
            <ClockIcon className="w-4 h-4" />
            版本
          </Button>
          {shots.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowReader(true)}>
              <BookIcon className="w-4 h-4" />
              阅读
            </Button>
          )}
          <Link href={`/projects/${projectId}/generate`}>
            <Button variant="outline" size="sm" className="gap-2">
              <WandIcon className="w-4 h-4" />生成视频
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/export`}>
            <Button variant="outline" size="sm" className="gap-2">
              <PlayIcon className="w-4 h-4" />导出
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-48 border-r border-divider bg-panel-deep p-4 space-y-1 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-anime-purple/10 text-anime-purple font-medium border border-anime-purple/20"
                  : "text-text-secondary hover:bg-panel-mid hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "characters" && <CharacterList projectId={projectId} />}

          {activeTab === "story" && (
            <div className="p-6 max-w-3xl">
              <h2 className="font-display text-2xl font-bold text-white mb-5">故事编排</h2>

              {/* 项目基本信息 */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="col-span-2">
                  <label className="block text-xs text-text-secondary mb-1.5">项目名称</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="给你的漫剧起个名字"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">风格</label>
                  <select
                    className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                    value={projectStyle}
                    onChange={(e) => setProjectStyle(e.target.value)}
                  >
                    <option value="">不指定</option>
                    <option value="动漫">动漫</option>
                    <option value="写实">写实</option>
                    <option value="漫画">漫画</option>
                    <option value="赛博">赛博</option>
                    <option value="古风">古风</option>
                    <option value="校园">校园</option>
                    <option value="悬疑">悬疑</option>
                    <option value="恋爱">恋爱</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">画面比例</label>
                  <select
                    className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                    value={projectAspectRatio}
                    onChange={(e) => setProjectAspectRatio(e.target.value)}
                  >
                    <option value="9:16">9:16 竖屏</option>
                    <option value="16:9">16:9 横屏</option>
                    <option value="1:1">1:1 方形</option>
                  </select>
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-divider mb-5" />

              {/* 状态提示 */}
              {shots.length > 0 ? (
                <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                  <span className="text-neon-cyan text-sm">✓</span>
                  <p className="text-sm text-text-secondary">
                    已生成 <span className="text-neon-cyan font-medium">{shots.length}</span> 个分镜
                    · 修改故事后重新生成将覆盖现有分镜
                  </p>
                </div>
              ) : prompt ? (
                <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-panel-mid border border-divider">
                  <span className="text-text-secondary text-sm">📝</span>
                  <p className="text-sm text-text-secondary">故事内容已加载，可继续编辑或生成分镜</p>
                </div>
              ) : (
                <p className="text-text-secondary text-sm mb-4">输入你的故事，AI 将自动拆分成多个分镜</p>
              )}

              {/* 模型配置提示 */}
              {!hasLlmKey && (
                <div className="mb-4 p-4 rounded-xl bg-warm-orange/10 border border-warm-orange/20">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warm-orange mb-1">需要配置 AI 模型</p>
                      <p className="text-xs text-text-secondary mb-3">
                        生成分镜需要配置大语言模型（如 DeepSeek）的 API Key
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

              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-text-secondary">故事内容</label>
                <button
                  onClick={() => setIsStoryExpanded(true)}
                  className="text-xs text-text-disabled hover:text-anime-purple transition-colors flex items-center gap-1"
                  title="全屏编辑"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                  全屏编辑
                </button>
              </div>
              <Textarea
                placeholder="输入你的故事或剧情描述...&#10;&#10;例如：在教室里，小明正在发呆。突然，门被推开了，一个陌生的女孩走了进来..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px] mb-4"
              />
              <div className="mb-5">
                <ShotCharacterBinding
                  projectId={projectId}
                  selectedCharacterIds={selectedCharacterIds}
                  onChange={setSelectedCharacterIds}
                />
                {selectedCharacterIds.length === 0 && (
                  <p className="text-xs text-text-disabled mt-2">
                    💡 不绑定角色也可生成分镜，但 AI 将自行推断角色外貌，多次生成可能导致角色形象不一致。
                    <button
                      className="text-anime-purple hover:underline ml-1"
                      onClick={() => setActiveTab("characters")}
                    >
                      去创建角色
                    </button>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerateStoryboard}
                  isLoading={generateMutation.isPending}
                  disabled={!prompt.trim() || !hasLlmKey}
                  className="gap-2"
                >
                  <SparklesIcon className="w-4 h-4" />
                  {generateMutation.isPending
                    ? "生成中..."
                    : shots.length > 0
                    ? "重新生成分镜"
                    : "生成分镜"}
                </Button>
                {shots.length > 0 && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setActiveTab("storyboard")}
                  >
                    查看分镜 →
                  </Button>
                )}
              </div>
            </div>
          )}

          {activeTab === "storyboard" && (
            <div className="flex gap-6 h-full p-6">
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold text-white">分镜编辑</h2>
                <p className="text-text-secondary text-sm mb-4">{shots.length} 个分镜</p>
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                  {shots.map((shot) => (
                    <ShotCard
                      key={shot.id}
                      shot={shot}
                      isSelected={selectedShotId === shot.id}
                      onClick={() => setSelectedShotId(shot.id)}
                      aspectRatio={project?.aspectRatio || "9:16"}
                    />
                  ))}
                </div>
              </div>
              {selectedShot && (
                <ShotDetailPanel
                  shot={selectedShot}
                  projectId={projectId}
                  onUpdate={(data) => updateShotMutation.mutate({ shotId: selectedShot.id, data: data as Record<string, unknown> })}
                  onDelete={() => setDeleteConfirmShotId(selectedShot.id)}
                  onGeneratePreview={() => previewMutation.mutate(selectedShot.id)}
                  isGeneratingPreview={previewMutation.isPending}
                  onClose={() => setSelectedShotId(null)}
                />
              )}
            </div>
          )}

          {activeTab === "timeline" && <StoryTimeline projectId={projectId} shots={shots} />}
        </div>
      </div>

      {showReader && shots.length > 0 && (
        <StoryboardReader shots={shots} onClose={() => setShowReader(false)} />
      )}

      {/* Version History */}
      <VersionHistory
        projectId={projectId}
        isOpen={showVersions}
        onClose={() => setShowVersions(false)}
      />

      {/* AI Assistant */}
      <AssistantChat projectId={projectId} projectName={project?.name} />

      {/* Delete Shot Confirm */}
      <ConfirmDialog
        open={!!deleteConfirmShotId}
        onClose={() => setDeleteConfirmShotId(null)}
        onConfirm={() => {
          if (deleteConfirmShotId) {
            deleteShotMutation.mutate(deleteConfirmShotId);
            setSelectedShotId(null);
          }
        }}
        title="确认删除分镜"
        description="删除后该分镜及其生成的资产将无法恢复。"
        confirmText="删除"
        variant="danger"
      />

    </div>
  );
}

function ShotCard({ shot, isSelected, onClick, aspectRatio = "9:16" }: { shot: Shot; isSelected: boolean; onClick: () => void; aspectRatio?: string }) {
  const previewUrl = shot.resultUrl || shot.imageUrl;
  // 根据项目画面比例设置卡片比例
  const ratioClass = aspectRatio === "16:9" ? "aspect-video" : aspectRatio === "1:1" ? "aspect-square" : "aspect-[3/4]";
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${
        isSelected ? "border-anime-purple" : "border-divider hover:border-anime-purple/50"
      }`}
      onClick={onClick}
    >
      <div className={`${ratioClass} bg-gradient-to-br from-anime-purple/10 to-panel-mid flex items-center justify-center relative`}>
        {previewUrl ? (
          <Image src={previewUrl} alt={`Shot ${shot.sequence}`} width={200} height={267} className="w-full h-full object-cover" />
        ) : shot.status === "generating" ? (
          <div className="w-8 h-8 rounded-full border-2 border-anime-purple border-t-transparent animate-spin" />
        ) : (
          <ImageIcon className="w-10 h-10 text-text-disabled" />
        )}
        <Badge
          className="absolute top-2 right-2 text-[10px]"
          variant={
            shot.status === "previewed" ? "success"
            : shot.status === "completed" ? "success"
            : shot.status === "generating" ? "warning"
            : shot.status === "failed" ? "error"
            : "info"
          }
        >
          {shot.status === "previewed" ? "已预览"
            : shot.status === "completed" ? "已完成"
            : shot.status === "generating" ? "生成中"
            : shot.status === "failed" ? "失败"
            : "待生成"}
        </Badge>
      </div>
      <div className="p-2 bg-panel-mid">
        <p className="text-sm font-medium text-white truncate">
          {shot.prompt?.substring(0, 20) || `分镜 ${shot.sequence}`}
        </p>
        <p className="text-xs text-text-disabled">#{shot.sequence}</p>
      </div>
    </motion.div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
