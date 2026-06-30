"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WandIcon } from "@/components/icons";

export default function GeneratePage() {
  const tasks = [{ id: "1", shot: "教室发呆", status: "completed", duration: "3s" },{ id: "2", shot: "门被推开", status: "generating", duration: "" },{ id: "3", shot: "目光相遇", status: "pending", duration: "" }];
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8"><div><h1 className="font-display text-3xl font-bold text-white mb-1">视频生成</h1><p className="text-text-secondary">将分镜转为视频片段</p></div><Button className="gap-2"><WandIcon className="w-4 h-4"/>全部生成</Button></div>
      <Card className="mb-6"><CardHeader><CardTitle>生成配置</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-4"><div><label className="block text-sm text-text-secondary mb-1">模型</label><select className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"><option>可灵 Kling Pro</option></select></div><div><label className="block text-sm text-text-secondary mb-1">时长</label><select className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"><option>3 秒</option><option>5 秒</option><option>10 秒</option></select></div><div><label className="block text-sm text-text-secondary mb-1">分辨率</label><select className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"><option>1080p</option><option>720p</option></select></div></div></CardContent></Card>
      <div className="space-y-3">{tasks.map((task)=>(<div key={task.id} className="flex items-center gap-4 p-4 rounded-lg bg-panel-deep border border-divider"><span className="text-text-disabled font-mono text-sm w-8">#{task.id}</span><div className="flex-1"><p className="text-white font-medium">{task.shot}</p>{task.duration&&<p className="text-xs text-text-disabled">时长 {task.duration}</p>}</div><Badge variant={task.status==="completed"?"success":task.status==="generating"?"warning":"info"}>{task.status==="completed"?"已完成":task.status==="generating"?"生成中":"待生成"}</Badge></div>))}</div>
    </div>
  );
}
