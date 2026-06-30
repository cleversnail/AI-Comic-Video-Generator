"use client";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "@/components/icons";

const timelineItems = [{ id: 1, type: "video", label: "教室发呆", duration: 3, color: "bg-anime-purple" },{ id: 2, type: "video", label: "门被推开", duration: 4, color: "bg-anime-purple" },{ id: 3, type: "video", label: "目光相遇", duration: 3, color: "bg-anime-purple" },{ id: 4, type: "video", label: "递日记本", duration: 3, color: "bg-anime-purple" },{ id: 5, type: "video", label: "脸红", duration: 4, color: "bg-anime-purple" },{ id: 6, type: "video", label: "夕阳", duration: 5, color: "bg-anime-purple" }];

export default function ExportPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8"><div><h1 className="font-display text-3xl font-bold text-white mb-1">后期导出</h1><p className="text-text-secondary">合成并导出最终视频</p></div><Button size="lg" className="gap-2">导出视频</Button></div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-panel-deep border border-divider rounded-xl overflow-hidden aspect-video flex items-center justify-center relative"><div className="absolute inset-0 bg-gradient-to-br from-anime-purple/10 to-neon-cyan/5"/><button className="relative w-16 h-16 rounded-full bg-anime-purple flex items-center justify-center hover:glow-purple transition-all"><PlayIcon className="w-6 h-6 text-white ml-1"/></button><div className="absolute bottom-4 left-4 right-4"><div className="h-1 bg-panel-mid rounded-full mb-2"><div className="h-full bg-anime-purple rounded-full" style={{width:"35%"}}/></div><div className="flex justify-between text-xs text-text-disabled"><span>0:08</span><span>0:22</span></div></div></div>
        <div className="space-y-6"><div className="bg-panel-deep border border-divider rounded-xl p-4"><h3 className="font-display text-sm font-semibold text-white mb-4">时间轴</h3><div className="flex gap-1 overflow-x-auto">{timelineItems.map((item)=>(<div key={item.id} className={`h-8 rounded ${item.color} flex items-center justify-center text-xs text-white font-medium px-2 min-w-[60px]`}>{item.label}</div>))}</div><div className="text-xs text-text-disabled mt-2">总时长: 22秒</div></div>
        <div className="bg-panel-deep border border-divider rounded-xl p-4"><h3 className="font-display text-sm font-semibold text-white">导出设置</h3><div className="space-y-3 mt-3"><div><label className="block text-xs text-text-secondary mb-1">格式</label><select className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"><option>MP4</option><option>MOV</option></select></div><div><label className="block text-xs text-text-secondary mb-1">画质</label><select className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"><option>1080p</option><option>4K</option></select></div><Button className="w-full mt-4">开始导出</Button></div></div></div>
      </div>
    </div>
  );
}
