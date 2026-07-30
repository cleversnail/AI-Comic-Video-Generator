"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PlayIcon, ImageIcon, WandIcon } from "@/components/icons";
import { projectsApi, storyboardApi, modelsApi, Shot } from "@/lib/api";
import Link from "next/link";
import { BackButton } from "@/components/navigation/back-button";
import { CharacterList } from "@/components/characters/character-list";
import { ShotCharacterBinding } from "@/components/storyboard/shot-character-binding";
import { ShotDetailPanel } from "@/components/storyboard/shot-detail-panel";
import { TtsPanel } from "@/components/storyboard/tts-panel";
import { StoryboardReader } from "@/components/storyboard/storyboard-reader";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { VersionHistory } from "@/components/version/version-history";
import { useToast } from "@/components/ui/toast";

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
  const [activeTab, setActiveTab] = useState("story");
  const [prompt, setPrompt] = useState("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

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
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [projectId]);

  // 保存草稿到本地存储
  useEffect(() => {
    const storageKey = STORAGE_KEY_PREFIX + projectId;
    const draft = {
      prompt,
      selectedCharacterIds,
      activeTab,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [projectId, prompt, selectedCharacterIds, activeTab]);

  // 获取 API Key 状态
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => modelsApi.listMyApiKeys(),
  });

  const hasLlmKey = apiKeys.some((k: any) => k.capability === "llm");
  const hasImageKey = apiKeys.some((k: any) => k.capability === "image");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.getProject(projectId),
  });
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
    onError: (error: any) => {
      toast.error("分镜生成失败", error?.response?.data?.message || error?.message);
    },
  });
  const previewMutation = useMutation({
    mutationFn: (shotId: string) => storyboardApi.previewShot(projectId, shotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("预览图生成成功");
    },
    onError: (error: any) => {
      toast.error("预览图生成失败", error?.response?.data?.message || error?.message);
    },
  });
  const deleteShotMutation = useMutation({
    mutationFn: (shotId: string) => storyboardApi.deleteShot(projectId, shotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("分镜已删除");
    },
    onError: (error: any) => {
      toast.error("删除失败", error?.response?.data?.message || error?.message);
    },
  });
  const updateShotMutation = useMutation({
    mutationFn: (data: { shotId: string; data: any }) =>
      storyboardApi.updateShot(projectId, data.shotId, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyboard", projectId] });
      toast.success("分镜已更新");
    },
    onError: (error: any) => {
      toast.error("更新失败", error?.response?.data?.message || error?.message);
    },
  });

  const shots: Shot[] = storyboard?.shots || [];
  const selectedShot = shots.find((s) => s.id === selectedShotId) || null;

  const handleGenerateStoryboard = () => {
    if (!prompt.trim()) return;
    generateMutation.mutate({
      prompt,
      characterIds: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
    });
  };

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
              <h2 className="font-display text-2xl font-bold text-white mb-6">故事编排</h2>

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

              <Textarea
                placeholder="输入你的故事或剧情描述..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px] mb-4"
              />
              <div className="mb-4">
                <ShotCharacterBinding
                  projectId={projectId}
                  selectedCharacterIds={selectedCharacterIds}
                  onChange={setSelectedCharacterIds}
                />
              </div>
              <Button
                onClick={handleGenerateStoryboard}
                isLoading={generateMutation.isPending}
                disabled={!prompt.trim() || !hasLlmKey}
                className="gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                {generateMutation.isPending ? "生成中..." : "生成分镜"}
              </Button>
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
                    />
                  ))}
                </div>
              </div>
              {selectedShot && (
                <ShotDetailPanel
                  shot={selectedShot}
                  projectId={projectId}
                  onUpdate={(data) => updateShotMutation.mutate({ shotId: selectedShot.id, data })}
                  onDelete={() => {
                    if (confirm("确认删除此分镜？")) {
                      deleteShotMutation.mutate(selectedShot.id);
                      setSelectedShotId(null);
                    }
                  }}
                  onGeneratePreview={() => previewMutation.mutate(selectedShot.id)}
                  isGeneratingPreview={previewMutation.isPending}
                  onClose={() => setSelectedShotId(null)}
                />
              )}
            </div>
          )}

          {activeTab === "timeline" && <TtsPanel projectId={projectId} shots={shots} />}
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
    </div>
  );
}

function ShotCard({ shot, isSelected, onClick }: { shot: Shot; isSelected: boolean; onClick: () => void }) {
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
      <div className="aspect-[3/4] bg-gradient-to-br from-anime-purple/10 to-panel-mid flex items-center justify-center relative">
        {shot.imageUrl ? (
          <img src={shot.imageUrl} alt={`Shot ${shot.sequence}`} className="w-full h-full object-cover" />
        ) : shot.status === "generating" ? (
          <div className="w-8 h-8 rounded-full border-2 border-anime-purple border-t-transparent animate-spin" />
        ) : (
          <ImageIcon className="w-10 h-10 text-text-disabled" />
        )}
        <Badge
          className="absolute top-2 right-2 text-[10px]"
          variant={
            shot.status === "completed" ? "success"
            : shot.status === "generating" ? "warning"
            : shot.status === "failed" ? "error"
            : "info"
          }
        >
          {shot.status === "completed" ? "已完成"
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
