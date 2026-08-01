"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckIcon, KeyIcon, SparklesIcon, ExternalLinkIcon } from "@/components/icons";
import { modelsApi, AIModel, UserApiKey, ModelParameter } from "@/lib/api";
import { CostPanel } from "@/components/cost/cost-panel";

const capabilities = [{ id: "all", name: "全部" },{ id: "llm", name: "大语言" },{ id: "image", name: "图像" },{ id: "video", name: "视频" },{ id: "tts", name: "语音" }];
interface ApiError { response?: { data?: { message?: string } } }
function formatPrice(rule?: { unitPrice: number; currency: string; unit: string }) { if (!rule) return "按量计费"; const currencySymbol = rule.currency==="CNY"?"¥":"$"; return `${currencySymbol}${rule.unitPrice}/${rule.unit}`; }
function getStatus(modelId: string, apiKeys: UserApiKey[] = []) { const key = apiKeys.find((k) => k.modelId===modelId); if (key) return { status: "configured", keyMask: key.keyMask }; return { status: "not_configured", keyMask: null }; }
function ParameterFields({ parameters }: { parameters?: ModelParameter[] }) {
  if (!parameters||parameters.length===0) return null;
  return (<div className="space-y-3"><p className="text-sm font-medium text-text-secondary">默认参数</p>{parameters.map((param)=>(<div key={param.key}><label className="block text-sm text-text-secondary mb-1">{param.name}</label>{param.type==="select"?<select className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white">{param.options?.map((opt)=><option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>)}</select>:param.type==="number"?<Input type="number" defaultValue={typeof param.defaultValue==="number"?param.defaultValue:undefined} min={param.min} max={param.max}/>:<Input defaultValue={typeof param.defaultValue==="string"?param.defaultValue:""}/>}</div>))}</div>);
}

export default function ModelsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCapability, setSelectedCapability] = useState("all");
  const [configuringModel, setConfiguringModel] = useState<AIModel|null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string|null>(null); // 编辑模式下的 Key ID
  const [apiKey, setApiKey] = useState("");
  const [alias, setAlias] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const { data: models=[], isLoading: modelsLoading } = useQuery({ queryKey: ["models",selectedCapability], queryFn: ()=>modelsApi.listModels(selectedCapability==="all"?undefined:selectedCapability) });
  const { data: apiKeys=[], isLoading: keysLoading } = useQuery({ queryKey: ["apiKeys"], queryFn: ()=>modelsApi.listMyApiKeys() });
  const createKeyMutation = useMutation({ mutationFn: modelsApi.createApiKey, onSuccess: ()=>{ queryClient.invalidateQueries({ queryKey: ["apiKeys"] }); closeConfig(); } });
  const updateKeyMutation = useMutation({ mutationFn: ({id, data}: {id: string; data: { apiKey?: string; alias?: string; isDefault?: boolean } })=>modelsApi.updateApiKey(id, data), onSuccess: ()=>{ queryClient.invalidateQueries({ queryKey: ["apiKeys"] }); closeConfig(); } });
  const deleteKeyMutation = useMutation({ mutationFn: modelsApi.deleteApiKey, onSuccess: ()=>{ queryClient.invalidateQueries({ queryKey: ["apiKeys"] }); } });
  const isLoading = modelsLoading||keysLoading;

  const closeConfig = () => {
    setConfiguringModel(null);
    setEditingKeyId(null);
    setApiKey("");
    setAlias("");
    setCustomModelName("");
  };

  const handleSave = () => {
    if (!configuringModel) return;

    if (editingKeyId) {
      // 编辑模式：更新现有 Key
      const updateData: { apiKey?: string; alias?: string; isDefault?: boolean } = {};
      if (alias.trim()) updateData.alias = alias.trim();
      if (customModelName) updateData.modelId = customModelName; // 注意：这里可能需要后端支持
      if (apiKey.trim()) updateData.apiKey = apiKey.trim();
      updateKeyMutation.mutate({ id: editingKeyId, data: updateData });
    } else {
      // 新建模式
      if (!apiKey.trim()) return;
      createKeyMutation.mutate({
        modelId: configuringModel.id,
        apiKey: apiKey.trim(),
        alias: alias.trim() || `${configuringModel.name} Key`,
        isDefault: true,
      });
    }
  };

  const isPending = editingKeyId ? updateKeyMutation.isPending : createKeyMutation.isPending;
  const isError = editingKeyId ? updateKeyMutation.isError : createKeyMutation.isError;
  const error = editingKeyId ? updateKeyMutation.error : createKeyMutation.error;

  // 各能力推荐的模型列表（按提供商分组）
  const recommendedModels: Record<string, Array<{id: string; name: string; desc: string}>> = {
    // DeepSeek 官方模型（https://api-docs.deepseek.com/zh-cn/quick_start/pricing）
    deepseek: [
      { id: "deepseek-chat", name: "DeepSeek-V4-Flash", desc: "快速响应模型，适合日常对话" },
      { id: "deepseek-reasoner", name: "DeepSeek-V4-Pro", desc: "专业推理模型，适合复杂任务" },
    ],
    // OpenAI 模型
    openai: [
      { id: "gpt-4o", name: "GPT-4o", desc: "多模态模型" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "轻量快速模型" },
      { id: "dall-e-3", name: "DALL-E 3", desc: "图像生成" },
      { id: "tts-1", name: "TTS-1", desc: "语音合成" },
    ],
    // Anthropic 模型
    anthropic: [
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", desc: "高性能模型" },
      { id: "claude-3-haiku", name: "Claude 3 Haiku", desc: "快速模型" },
    ],
    // 其他 LLM
    other_llm: [
      { id: "qwen-turbo", name: "通义千问 Turbo", desc: "阿里云快速模型" },
      { id: "glm-4", name: "GLM-4", desc: "智谱 AI 对话模型" },
      { id: "kimi", name: "Kimi", desc: "Moonshot 长文本模型" },
    ],
    // 图像模型
    image: [
      { id: "flux", name: "FLUX.1", desc: "Black Forest Labs" },
      { id: "stable-diffusion-xl", name: "Stable Diffusion XL", desc: "开源图像生成" },
    ],
    // 语音模型
    tts: [
      { id: "minimax-tts", name: "MiniMax TTS", desc: "中文语音合成" },
      { id: "elevenlabs", name: "ElevenLabs", desc: "高质量语音合成" },
    ],
    // 视频模型
    video: [
      { id: "kling-video", name: "可灵视频", desc: "快手视频生成" },
      { id: "runway-gen-3", name: "Runway Gen-3", desc: "Runway 视频生成" },
      { id: "pika", name: "Pika", desc: "Pika 视频生成" },
    ],
  };

  // 根据当前配置的模型获取推荐列表
  const getRecommendedModels = (model: AIModel | null) => {
    if (!model) return [];

    // 根据模型 provider 和 capability 返回对应的推荐列表
    const provider = model.provider?.toLowerCase() || '';
    const capability = model.capability || '';

    if (provider.includes('deepseek')) return recommendedModels.deepseek;
    if (provider.includes('openai')) return recommendedModels.openai;
    if (provider.includes('anthropic') || provider.includes('claude')) return recommendedModels.anthropic;
    if (capability === 'image') return recommendedModels.image;
    if (capability === 'tts') return recommendedModels.tts;
    if (capability === 'video') return recommendedModels.video;

    // 默认返回对应能力的推荐
    if (capability === 'llm') return recommendedModels.other_llm;
    return [];
  };

  const handleModelSelect = (modelId: string, modelName: string) => {
    setCustomModelName(modelId);
    if (!alias) setAlias(modelName);
  };

  // 打开配置弹窗时，如果已配置则回显内容
  const handleOpenConfig = (model: AIModel) => {
    setConfiguringModel(model);
    const existingKey = apiKeys.find((k: { modelId: string; capability?: string }) => k.modelId === model.id);
    if (existingKey) {
      setEditingKeyId(existingKey.id);
      setAlias(existingKey.alias || "");
      setCustomModelName(existingKey.modelId || "");
    } else {
      setEditingKeyId(null);
      setAlias("");
      setCustomModelName("");
    }
    setApiKey(""); // 出于安全考虑，不回显 API Key
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-mid border border-divider text-text-secondary hover:text-white hover:border-anime-purple/50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-white mb-1">模型中心</h1>
          <p className="text-text-secondary">选择 AI 模型并配置 API Key，所有配置会在创作流程中直接可用</p>
        </div>
        <Button variant="outline" className="gap-2"><SparklesIcon className="w-4 h-4"/>推荐组合</Button>
      </div>

      {/* Model Usage Guide */}
      <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-anime-purple/5 to-panel-mid border border-divider">
        <h3 className="font-display text-lg font-bold text-white mb-4">🎯 功能与模型对照</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-panel-deep border border-divider">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📝</span>
              <h4 className="text-sm font-medium text-white">生成分镜 / 创作助手</h4>
            </div>
            <p className="text-xs text-text-secondary mb-2">需要配置<strong className="text-anime-purple">大语言模型</strong></p>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">DeepSeek-V4-Flash</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">DeepSeek-V4-Pro</span>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-panel-deep border border-divider">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎨</span>
              <h4 className="text-sm font-medium text-white">生成预览图 / 四视图</h4>
            </div>
            <p className="text-xs text-text-secondary mb-2">需要配置<strong className="text-anime-purple">图像生成模型</strong></p>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">FLUX</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">可灵</span>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-panel-deep border border-divider">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔊</span>
              <h4 className="text-sm font-medium text-white">TTS 配音</h4>
            </div>
            <p className="text-xs text-text-secondary mb-2">需要配置<strong className="text-anime-purple">语音合成模型</strong></p>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">MiniMax TTS</span>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-panel-deep border border-divider">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎬</span>
              <h4 className="text-sm font-medium text-white">生成视频</h4>
            </div>
            <p className="text-xs text-text-secondary mb-2">需要配置<strong className="text-anime-purple">视频生成模型</strong></p>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">可灵视频</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-text-disabled mt-4">💡 建议至少配置一个大语言模型和一个图像生成模型，即可使用核心功能</p>
      </div>

      {/* Cost Overview */}
      <div className="mb-8">
        <h2 className="font-display text-xl font-bold text-white mb-4">成本概览</h2>
        <CostPanel />
      </div>

      <h2 className="font-display text-xl font-bold text-white mb-4">模型配置</h2>
      <div className="flex flex-wrap gap-2 mb-8">{capabilities.map((cap)=>(<button key={cap.id} onClick={()=>setSelectedCapability(cap.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCapability===cap.id?"bg-anime-purple text-white":"bg-panel-deep border border-divider text-text-secondary hover:text-white hover:border-anime-purple/40"}`}>{cap.name}</button>))}</div>
      {isLoading?(<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{[1,2,3].map(i=><Card key={i} className="h-48 animate-pulse bg-panel-deep"/>)}</div>):(<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"><AnimatePresence mode="popLayout">{models.map((model: AIModel) =>{const {status,keyMask}=getStatus(model.id,apiKeys);return (<motion.div key={model.id} layout initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} transition={{duration:0.2}}><Card className="h-full hover:border-anime-purple/30 transition-colors"><CardHeader className="pb-3"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-panel-mid flex items-center justify-center"><KeyIcon className="w-5 h-5 text-anime-purple"/></div><div><CardTitle className="text-base">{model.name}</CardTitle><CardDescription>{model.provider}</CardDescription></div></div><Badge variant={status==="configured"?"success":status==="not_configured"?"warning":"info"}>{status==="configured"?"已配置":status==="not_configured"?"未配置":"可选"}</Badge></div></CardHeader><CardContent><p className="text-sm text-text-secondary mb-1">{formatPrice(model.billingRule)}</p><p className="text-xs text-text-disabled line-clamp-2 mb-4 h-8">{model.description}</p>{status==="configured"&&keyMask&&(<div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-panel-mid border border-divider"><CheckIcon className="w-4 h-4 text-neon-cyan"/><span className="text-sm text-text-secondary font-mono">{keyMask}</span></div>)}<div className="flex gap-2"><Button variant={status==="configured"?"secondary":"primary"} size="sm" className="flex-1" onClick={()=>handleOpenConfig(model)}>{status==="configured"?"编辑配置":"配置 API Key"}</Button>{status==="configured"&&(<Button variant="outline" size="sm" className="px-2 border-warm-orange/30 text-warm-orange hover:bg-warm-orange/10" onClick={()=>{const key=apiKeys.find((k: { modelId: string; capability?: string }) =>k.modelId===model.id);if(key)deleteKeyMutation.mutate(key.id);}}>删除</Button>)}<Button variant="outline" size="sm" className="px-2" onClick={()=>model.docUrl&&window.open(model.docUrl,"_blank")}><ExternalLinkIcon className="w-4 h-4"/></Button></div></CardContent></Card></motion.div>);})}</AnimatePresence></div>)}
      <AnimatePresence>{configuringModel&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm" onClick={()=>closeConfig()}><motion.div initial={{opacity:0,x:100}} animate={{opacity:1,x:0}} exit={{opacity:0,x:100}} onClick={e=>e.stopPropagation()} className="w-full max-w-md h-full bg-panel-deep border-l border-divider shadow-2xl overflow-y-auto"><div className="p-6 border-b border-divider"><div className="flex items-center justify-between"><div><h3 className="font-display text-xl font-bold text-white">{configuringModel.name}</h3><p className="text-sm text-text-secondary">{configuringModel.provider} · {capabilities.find((c)=>c.id===configuringModel.capability)?.name}</p></div><button onClick={()=>closeConfig()} className="text-text-secondary hover:text-white">✕</button></div></div><div className="p-6 space-y-6">
        {/* 模型选择 */}
        <div className="p-4 rounded-lg bg-panel-mid border border-divider">
          <p className="text-sm font-medium text-text-secondary mb-3">选择模型</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">从推荐列表选择</label>
              <select
                className="w-full h-10 rounded-lg border border-divider bg-panel-deep px-3 text-sm text-white"
                value={customModelName}
                onChange={(e) => {
                  const selected = getRecommendedModels(configuringModel)?.find(m => m.id === e.target.value);
                  if (selected) handleModelSelect(selected.id, selected.name);
                }}
              >
                <option value="">-- 选择推荐模型 --</option>
                {getRecommendedModels(configuringModel).map((m) => (
                  <option key={m.id} value={m.id}>{m.name} - {m.desc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">或手动输入模型名称</label>
              <Input
                placeholder="例如：deepseek-chat, gpt-4o, claude-3-5-sonnet"
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
              />
              <p className="text-[10px] text-text-disabled mt-1">
                输入你使用的 API 服务商对应的模型 ID
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-panel-mid border border-divider"><p className="text-sm text-text-secondary mb-2">参考价格</p><p className="text-white font-medium">{formatPrice(configuringModel.billingRule)}</p>{configuringModel.docUrl&&(<a href={configuringModel.docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-anime-purple hover:underline mt-2">去官方获取 API Key<ExternalLinkIcon className="w-3 h-3"/></a>)}</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">API Key</label>
            <Input type="password" placeholder={editingKeyId ? "留空则不更新" : "sk-..."} value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Key 别名</label>
            <Input placeholder="例如：我的主 Key" value={alias} onChange={e=>setAlias(e.target.value)}/>
          </div>
          <ParameterFields parameters={configuringModel.parameters}/>
        </div>
        {isError && (
          <div className="p-3 rounded-lg bg-warm-orange/10 border border-warm-orange/30 text-warm-orange text-sm">
            {(error as ApiError)?.response?.data?.message || "验证失败，请检查 API Key"}
          </div>
        )}
        <Button
          className="w-full gap-2"
          onClick={handleSave}
          disabled={(!editingKeyId && !apiKey.trim()) || isPending}
          isLoading={isPending}
        >
          <CheckIcon className="w-4 h-4"/>
          {isPending ? (editingKeyId ? "更新中..." : "验证中...") : (editingKeyId ? "更新配置" : "验证并保存")}
        </Button>
      </div></motion.div></motion.div>)}</AnimatePresence>
    </div>
  );
}
