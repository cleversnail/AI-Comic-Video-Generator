"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PlayIcon, ImageIcon, WandIcon } from "@/components/icons";
import { projectsApi, storyboardApi, ShotPreview, Shot } from "@/lib/api";
import Link from "next/link";
import { BackButton } from "@/components/navigation/back-button";
import { CharacterList } from "@/components/characters/character-list";
import { ShotCharacterBinding } from "@/components/storyboard/shot-character-binding";
import { ShotDetailPanel } from "@/components/storyboard/shot-detail-panel";
import { TtsPanel } from "@/components/storyboard/tts-panel";

const tabs = [
  { id: "characters", label: "角色" },
  { id: "story", label: "故事" },
  { id: "storyboard", label: "分镜" },
  { id: "timeline", label: "时间轴" },
];
const shotTypes = ["特写","近景","中景","全景","远景"];
const cameraAngles = ["平视","俯拍","仰拍","跟拍","固定"];

export default function StudioPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("story");
  const [prompt, setPrompt] = useState("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedShotId, setSelectedShotId] = useState<string|null>(null);
  const { data: project } = useQuery({ queryKey: ["project",projectId], queryFn: ()=>projectsApi.getProject(projectId) });
  const { data: storyboard } = useQuery({ queryKey: ["storyboard",projectId], queryFn: ()=>storyboardApi.getStoryboard(projectId) });
  const generateMutation = useMutation({ mutationFn: (data:{prompt:string; characterIds?: string[]})=>storyboardApi.generate(projectId,data), onSuccess:()=>{ queryClient.invalidateQueries({queryKey:["storyboard",projectId]}); } });
  const previewMutation = useMutation({ mutationFn: (shotId:string)=>storyboardApi.previewShot(projectId, shotId), onSuccess:()=>{ queryClient.invalidateQueries({queryKey:["storyboard",projectId]}); } });
  const deleteShotMutation = useMutation({ mutationFn: (shotId:string)=>storyboardApi.deleteShot(projectId,shotId), onSuccess:()=>{ queryClient.invalidateQueries({queryKey:["storyboard",projectId]}); } });
  const updateShotMutation = useMutation({ mutationFn: (data: { shotId: string; data: any })=>storyboardApi.updateShot(projectId, data.shotId, data.data), onSuccess:()=>{ queryClient.invalidateQueries({queryKey:["storyboard",projectId]}); } });
  const shots = storyboard?.shots || [];
  const selectedShot = shots.find((s: Shot)=>s.id===selectedShotId)||null;

  const handleGenerateStoryboard = () => {
    if (!prompt.trim()) return;
    generateMutation.mutate({
      prompt,
      characterIds: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-cinema">
      <header className="h-16 border-b border-divider bg-panel-deep flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <BackButton href="/projects" label="项目列表" />
          <div className="w-px h-6 bg-divider" />
          <h1 className="font-display text-lg font-semibold text-white">{project?.name||"加载中..."}</h1>
          {project?.status&&<Badge variant={project.status==="draft"?"info":"success"} className="ml-2">{project.status==="draft"?"草稿":"进行中"}</Badge>}
        </div>
        <div className="flex gap-3"><Link href={`/projects/${projectId}/generate`}><Button variant="outline" size="sm" className="gap-2"><WandIcon className="w-4 h-4"/>生成视频</Button></Link><Link href={`/projects/${projectId}/export`}><Button variant="outline" size="sm" className="gap-2"><PlayIcon className="w-4 h-4"/>导出</Button></Link></div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <nav className="w-48 border-r border-divider bg-panel-deep p-4 space-y-1 flex-shrink-0">
          {tabs.map(tab=>(<button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab===tab.id?"bg-anime-purple/10 text-anime-purple font-medium border border-anime-purple/20":"text-text-secondary hover:bg-panel-mid hover:text-white"}`}><span>{tab.label}</span></button>))}
        </nav>
        <div className="flex-1 overflow-auto">
          {activeTab==="characters"&&(<CharacterList projectId={projectId} />)}
          {activeTab==="story"&&(<div className="p-6 max-w-3xl"><h2 className="font-display text-2xl font-bold text-white mb-6">故事编排</h2><Textarea placeholder="输入你的故事或剧情描述..." value={prompt} onChange={e=>setPrompt(e.target.value)} className="min-h-[200px] mb-4"/><div className="mb-4"><ShotCharacterBinding projectId={projectId} selectedCharacterIds={selectedCharacterIds} onChange={setSelectedCharacterIds} /></div><Button onClick={handleGenerateStoryboard} isLoading={generateMutation.isPending} disabled={!prompt.trim()} className="gap-2"><SparklesIcon className="w-4 h-4"/>{generateMutation.isPending?"生成中...":"生成分镜"}</Button></div>)}
          {activeTab==="storyboard"&&(<div className="flex gap-6 h-full p-6"><div className="flex-1"><h2 className="font-display text-2xl font-bold text-white">分镜编辑</h2><p className="text-text-secondary text-sm mb-4">{shots.length} 个分镜</p><div className="grid grid-cols-3 lg:grid-cols-4 gap-3">{shots.map((shot: Shot)=>(<motion.div key={shot.id} layout initial={{opacity:0}} animate={{opacity:1}} className={`rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${selectedShotId===shot.id?"border-anime-purple":"border-divider hover:border-anime-purple/50"}`} onClick={()=>setSelectedShotId(shot.id)}><div className="aspect-[3/4] bg-gradient-to-br from-anime-purple/10 to-panel-mid flex items-center justify-center relative">{shot.imageUrl?<img src={shot.imageUrl} alt={`Shot ${shot.sequence}`} className="w-full h-full object-cover"/>:shot.status==="generating"?<div className="w-8 h-8 rounded-full border-2 border-anime-purple border-t-transparent animate-spin"/>:<ImageIcon className="w-10 h-10 text-text-disabled"/>}<Badge className="absolute top-2 right-2 text-[10px]" variant={shot.status==="completed"?"success":shot.status==="generating"?"warning":shot.status==="failed"?"error":"info"}>{shot.status==="completed"?"已完成":shot.status==="generating"?"生成中":shot.status==="failed"?"失败":"待生成"}</Badge></div><div className="p-2 bg-panel-mid"><p className="text-sm font-medium text-white truncate">{shot.prompt?.substring(0,20)||`分镜 ${shot.sequence}`}</p><p className="text-xs text-text-disabled">#{shot.sequence}</p></div></motion.div>))}</div></div>{selectedShot&&(<ShotDetailPanel
  shot={selectedShot}
  projectId={projectId}
  onUpdate={(data) => updateShotMutation.mutate({ shotId: selectedShot.id, data })}
  onDelete={() => { if(confirm("确认删除此分镜？")) { deleteShotMutation.mutate(selectedShot.id); setSelectedShotId(null); } }}
  onGeneratePreview={() => previewMutation.mutate(selectedShot.id)}
  isGeneratingPreview={previewMutation.isPending}
  onClose={() => setSelectedShotId(null)}
/>)}</div>)}
          {activeTab==="timeline"&&(<TtsPanel projectId={projectId} shots={shots} />)}
        </div>
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/></svg>);
}
