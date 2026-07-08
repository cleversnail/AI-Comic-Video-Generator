"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FilmIcon, SparklesIcon, ChevronRightIcon } from "@/components/icons";
import Link from "next/link";

const exampleFrames = [
  { id: 1, title: "教室", duration: "3s", color: "from-purple-500/20 to-blue-500/20" },
  { id: 2, title: "门开", duration: "4s", color: "from-cyan-500/20 to-emerald-500/20" },
  { id: 3, title: "对视", duration: "3s", color: "from-pink-500/20 to-rose-500/20" },
  { id: 4, title: "递本", duration: "3s", color: "from-amber-500/20 to-orange-500/20" },
  { id: 5, title: "脸红", duration: "4s", color: "from-red-500/20 to-pink-500/20" },
  { id: 6, title: "夕阳", duration: "5s", color: "from-indigo-500/20 to-purple-500/20" },
];

const steps = [
  { number: "01", title: "设定角色", desc: "描述角色外貌与性格，AI 生成一致形象" },
  { number: "02", title: "输入故事", desc: "输入一段剧情，选择喜欢的漫剧风格" },
  { number: "03", title: "一键粗剪", desc: "AI 自动分镜、预览、配音、生成视频片段" },
  { number: "04", title: "精修导出", desc: "不满意就重生成，满意后导出成片" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-cinema overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-anime-purple/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-neon-cyan/5 rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 border-b border-divider/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilmIcon className="w-6 h-6 text-anime-purple" />
            <span className="font-display text-lg font-bold text-white">AI 漫剧创作台</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a href="#features" className="hover:text-white transition-colors">功能</a>
            <a href="#workflow" className="hover:text-white transition-colors">流程</a>
            <a href="#models" className="hover:text-white transition-colors">模型</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">登录</Button>
            <Link href="/projects"><Button size="sm">开始创作</Button></Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 container mx-auto px-6 pt-16 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-anime-purple/10 border border-anime-purple/20 text-anime-purple text-xs font-medium mb-6">
                <SparklesIcon className="w-3.5 h-3.5" />
                支持自定义 AI 模型与 API Key
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
                3 分钟，<br />把故事变成<span className="text-anime-purple">漫剧</span>
              </h1>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                输入角色和故事，AI 自动分镜、生成画面、配音、合成视频。可灵、豆包、DeepSeek……每个环节都使用你选择的模型。
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/projects"><Button size="lg" className="gap-2">立即创作第一条漫剧<ChevronRightIcon className="w-4 h-4" /></Button></Link>
                <Link href="/settings/models"><Button variant="outline" size="lg">配置模型</Button></Link>
              </div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-anime-purple/20 to-neon-cyan/20 rounded-3xl blur-2xl" />
            <div className="relative grid grid-cols-3 gap-2 p-3 bg-panel-deep/80 backdrop-blur-xl border border-divider rounded-2xl">
              {exampleFrames.map((frame, index) => (
                <motion.div key={frame.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }} className={`aspect-[3/4] rounded-lg bg-gradient-to-br ${frame.color} border border-white/10 p-3 flex flex-col justify-between group hover:border-anime-purple/50 transition-colors cursor-pointer`}>
                  <div className="w-full h-1/2 rounded bg-black/20" />
                  <div className="flex items-end justify-between">
                    <span className="text-xs font-medium text-white/80">{frame.title}</span>
                    <span className="text-[10px] text-white/50 font-mono">{frame.duration}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="absolute -bottom-4 -right-4 px-4 py-2 bg-panel-deep border border-divider rounded-lg shadow-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-xs text-text-secondary">6 个分镜 · 22 秒</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="relative z-10 container mx-auto px-6 py-20 border-t border-divider/50">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl font-bold text-white mb-4">为创作者设计的完整工作流</h2>
          <p className="text-text-secondary">从角色到视频，每一步都有 AI 辅助，但控制权始终在你手中</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[{ title: "极速出片", desc: "新手 3 步就能看到第一条漫剧草稿，先建立成就感，再决定要不要精修。", icon: "⚡" }, { title: "镜头语言引导", desc: "不用背提示词术语，选择景别、角度、运镜，系统自动生成专业视频提示词。", icon: "🎬" }, { title: "模型自由组合", desc: "角色图用 FLUX，视频用可灵，配音用 ElevenLabs——每个环节都用你信任的模型。", icon: "🔧" }].map((feature, index) => (
            <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="p-6 rounded-xl bg-panel-deep border border-divider hover:border-anime-purple/40 transition-colors">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="workflow" className="relative z-10 container mx-auto px-6 py-20 border-t border-divider/50">
        <h2 className="font-display text-3xl font-bold text-white mb-12 text-center">极速模式：4 步出片</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <motion.div key={step.number} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="relative p-6 rounded-xl bg-panel-deep border border-divider">
              <span className="font-mono text-4xl font-bold text-anime-purple/20">{step.number}</span>
              <h3 className="font-display text-lg font-semibold text-white mt-2 mb-2">{step.title}</h3>
              <p className="text-sm text-text-secondary">{step.desc}</p>
              {index < steps.length - 1 && (<div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2"><ChevronRightIcon className="w-5 h-5 text-divider" /></div>)}
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="relative overflow-hidden rounded-2xl bg-panel-deep border border-divider p-10 md:p-16 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-anime-purple to-transparent" />
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">准备好开始你的第一部漫剧了吗？</h2>
          <p className="text-text-secondary mb-8 max-w-lg mx-auto">无需信用卡，配置好你的模型 API Key 即可开始创作</p>
          <Link href="/projects"><Button size="lg">立即创作第一条漫剧</Button></Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-divider/50 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-2"><FilmIcon className="w-5 h-5 text-anime-purple" /><span className="font-display font-semibold text-white">AI 漫剧创作台</span></div>
          <p>© 2026 AI 漫剧创作台. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
