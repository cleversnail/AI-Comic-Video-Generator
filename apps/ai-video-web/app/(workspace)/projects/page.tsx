"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, SparklesIcon } from "@/components/icons";
import { projectsApi, CreateProjectDto, Project } from "@/lib/api";
import Link from "next/link";

function ClockIcon({ className }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState<CreateProjectDto>({ name: "" });
  const { data: projects = [], isLoading } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.listProjects });
  const createMutation = useMutation({ mutationFn: projectsApi.createProject, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowCreate(false); setNewProject({ name: "" }); } });
  const deleteMutation = useMutation({ mutationFn: projectsApi.deleteProject, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); } });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div><h1 className="font-display text-3xl font-bold text-white mb-1">我的漫剧项目</h1><p className="text-text-secondary">管理和继续你的创作</p></div>
        <div className="flex gap-3"><Button variant="outline" className="gap-2"><SparklesIcon className="w-4 h-4"/>极速创作</Button><Button className="gap-2" onClick={()=>setShowCreate(true)}><PlusIcon className="w-4 h-4"/>新建项目</Button></div>
      </div>
      {isLoading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3].map(i=><Card key={i} className="h-48 animate-pulse"/>)}</div>)
      : projects.length===0 ? (<Card className="border-dashed border-2 border-divider bg-transparent flex flex-col items-center justify-center py-20"><div className="w-16 h-16 rounded-full bg-panel-mid flex items-center justify-center mb-4"><PlusIcon className="w-8 h-8 text-text-secondary"/></div><p className="text-text-secondary mb-4">还没有项目，开始创建第一个吧</p><Button onClick={()=>setShowCreate(true)}>创建新项目</Button></Card>)
      : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{projects.map((project: Project, index: number) => (<motion.div key={project.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:index*0.1}}><Card className="h-full hover:border-anime-purple/40 transition-colors group relative"><Link href={`/projects/${project.id}/studio`}><CardHeader className="pb-4"><div className="flex items-start justify-between"><Badge variant={project.status==="draft"?"info":"success"}>{project.status==="draft"?"草稿":"进行中"}</Badge><span className="text-xs text-text-disabled flex items-center gap-1"><ClockIcon className="w-3 h-3"/>{timeAgo(project.updatedAt)}</span></div><CardTitle className="mt-3">{project.name}</CardTitle>{project.description&&<CardDescription>{project.description}</CardDescription>}</CardHeader><CardContent><div className="flex items-center justify-between text-sm"><span className="text-text-secondary">{project.shotCount>0?`${project.shotCount} 个分镜`:"未生成分镜"}</span>{project.style&&<Badge variant="default" className="text-[10px]">{project.style}</Badge>}</div></CardContent></Link><button onClick={e=>{e.preventDefault();if(confirm("确认删除项目？"))deleteMutation.mutate(project.id);}} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-text-disabled hover:text-warm-orange transition-all text-xs">删除</button></Card></motion.div>))}</div>)}
      <AnimatePresence>{showCreate&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={()=>setShowCreate(false)}><motion.div initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:20}} onClick={e=>e.stopPropagation()} className="w-full max-w-md bg-panel-deep border border-divider rounded-2xl p-6 shadow-2xl"><h3 className="font-display text-xl font-bold text-white mb-4">新建项目</h3><div className="space-y-4"><div><label className="block text-sm font-medium text-text-secondary mb-2">项目名称</label><Input placeholder="例如：青春校园漫剧" value={newProject.name} onChange={e=>setNewProject({...newProject,name:e.target.value})}/></div><div><label className="block text-sm font-medium text-text-secondary mb-2">故事简介（可选）</label><Textarea placeholder="一句话描述你的故事..." value={newProject.description||""} onChange={e=>setNewProject({...newProject,description:e.target.value})} className="min-h-[80px]"/></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-text-secondary mb-2">风格</label><select className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white" value={newProject.style||""} onChange={e=>setNewProject({...newProject,style:e.target.value})}><option value="">不指定</option><option value="校园">校园</option><option value="古风">古风</option><option value="赛博">赛博</option><option value="悬疑">悬疑</option><option value="恋爱">恋爱</option></select></div><div><label className="block text-sm font-medium text-text-secondary mb-2">画面比例</label><select className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white" value={newProject.aspectRatio||"9:16"} onChange={e=>setNewProject({...newProject,aspectRatio:e.target.value})}><option value="9:16">9:16 竖屏</option><option value="16:9">16:9 横屏</option><option value="1:1">1:1 方形</option></select></div></div></div><div className="flex gap-3 mt-6"><Button variant="secondary" className="flex-1" onClick={()=>setShowCreate(false)}>取消</Button><Button className="flex-1" disabled={!newProject.name.trim()||createMutation.isPending} isLoading={createMutation.isPending} onClick={()=>createMutation.mutate(newProject)}>创建项目</Button></div></motion.div></motion.div>)}</AnimatePresence>
    </div>
  );
}
