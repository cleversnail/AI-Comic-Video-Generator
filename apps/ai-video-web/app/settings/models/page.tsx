"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckIcon, ExternalLinkIcon } from "@/components/icons";
import { modelsApi, AIModel, UserApiKey, ModelParameter } from "@/lib/api";
import { CostPanel } from "@/components/cost/cost-panel";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const capabilityConfig: Record<string, { name: string; icon: string; description: string; color: string }> = {
  llm: { name: "文本生成", icon: "📝", description: "故事创作、分镜拆分、对话生成", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  image: { name: "图片生成", icon: "🎨", description: "角色图、分镜预览图、场景图", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  video: { name: "视频生成", icon: "🎬", description: "漫剧视频片段、动态效果", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  tts: { name: "语音合成", icon: "🔊", description: "角色配音、旁白、音效", color: "bg-green-500/10 text-green-400 border-green-500/20" },
};

const providerConfig: Record<string, { name: string; icon: string; website: string; description: string }> = {
  DeepSeek: { name: "DeepSeek", icon: "🔮", website: "https://platform.deepseek.com", description: "深度求索大语言模型" },
  ByteDance: { name: "字节跳动", icon: "🌊", website: "https://console.volcengine.com", description: "豆包、即梦、Seedance" },
  Kling: { name: "可灵", icon: "✨", website: "https://klingai.com", description: "快手可灵 AI" },
  Moonshot: { name: "月之暗面", icon: "🌙", website: "https://platform.moonshot.cn", description: "Kimi 大语言模型" },
  MiniMax: { name: "MiniMax", icon: "🎵", website: "https://platform.minimaxi.com", description: "语音合成" },
  ElevenLabs: { name: "ElevenLabs", icon: "🎙️", website: "https://elevenlabs.io", description: "高质量语音合成" },
  "Black Forest Labs": { name: "Black Forest Labs", icon: "🌲", website: "https://replicate.com", description: "FLUX 图像生成" },
};

function formatPrice(rule?: { unitPrice: number; currency: string; unit: string }) {
  if (!rule) return "按量计费";
  const s = rule.currency === "CNY" ? "¥" : "$";
  return `${s}${rule.unitPrice}/${rule.unit}`;
}

function getStatus(modelId: string, apiKeys: UserApiKey[]) {
  const key = apiKeys.find((k) => k.modelId === modelId);
  return key ? { status: "configured" as const, keyMask: key.keyMask } : { status: "not_configured" as const, keyMask: null };
}

function ParameterFields({ parameters, customModelName, onCustomModelNameChange }: {
  parameters?: ModelParameter[];
  customModelName?: string;
  onCustomModelNameChange?: (value: string) => void;
}) {
  if (!parameters || parameters.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-secondary">模型参数</p>
      {parameters.map((param) => (
        <div key={param.key}>
          <label className="block text-xs text-text-secondary mb-1">{param.name}</label>
          {param.type === "select" ? (
            <div className="space-y-2">
              <select
                className="w-full h-10 rounded-lg border border-divider bg-panel-mid px-3 text-sm text-white"
                value={customModelName ? "__custom__" : String(param.defaultValue || "")}
                onChange={(e) => {
                  if (e.target.value !== "__custom__" && onCustomModelNameChange) {
                    onCustomModelNameChange("");  // 选择下拉项时清空自定义输入
                  }
                }}
              >
                {param.options?.map((opt) => <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>)}
                <option value="__custom__">
                  {customModelName ? `✅ 已启用自定义模型: ${customModelName}` : "自定义模型名称..."}
                </option>
              </select>
              <Input
                placeholder="或手动输入模型名称..."
                className="text-xs"
                value={customModelName || ""}
                onChange={(e) => onCustomModelNameChange?.(e.target.value)}
              />
              <p className="text-[10px] text-text-disabled">可从下拉列表选择，或手动输入自定义模型名称（手动输入优先）</p>
            </div>
          ) : param.type === "number" ? (
            <Input type="number" defaultValue={typeof param.defaultValue === "number" ? param.defaultValue : undefined} min={param.min} max={param.max} />
          ) : (
            <Input defaultValue={typeof param.defaultValue === "string" ? param.defaultValue : ""} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ModelsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [configuringModel, setConfiguringModel] = useState<AIModel | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [alias, setAlias] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: models = [], isLoading: modelsLoading } = useQuery<AIModel[]>({ queryKey: ["models"], queryFn: () => modelsApi.listModels() as unknown as AIModel[] });
  const { data: apiKeys = [], isLoading: keysLoading } = useQuery<UserApiKey[]>({ queryKey: ["apiKeys"], queryFn: () => modelsApi.listMyApiKeys() as unknown as UserApiKey[] });

  const createKeyMutation = useMutation({
    mutationFn: modelsApi.createApiKey,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["apiKeys"] }); closeConfig(); toast.success("API Key 配置成功"); },
    onError: (e: unknown) => { toast.error("配置失败", getApiErrorMessage(e)); },
  });
  const updateKeyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { apiKey?: string; alias?: string; isDefault?: boolean } }) => modelsApi.updateApiKey(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["apiKeys"] }); closeConfig(); toast.success("API Key 更新成功"); },
    onError: (e: unknown) => { toast.error("更新失败", getApiErrorMessage(e)); },
  });
  const deleteKeyMutation = useMutation({
    mutationFn: modelsApi.deleteApiKey,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["apiKeys"] }); toast.success("API Key 已删除"); closeConfig(); },
    onError: (e: unknown) => { toast.error("删除失败", getApiErrorMessage(e)); },
  });

  const groupedModels = (models as AIModel[]).reduce((acc: Record<string, Record<string, AIModel[]>>, model: AIModel) => {
    const provider = model.provider || "其他";
    const capability = model.capability || "其他";
    if (!acc[provider]) acc[provider] = {};
    if (!acc[provider][capability]) acc[provider][capability] = [];
    acc[provider][capability].push(model);
    return acc;
  }, {});

  const closeConfig = () => { setConfiguringModel(null); setEditingKeyId(null); setApiKey(""); setAlias(""); setCustomModelName(""); };

  const handleOpenConfig = (model: AIModel) => {
    setConfiguringModel(model);
    const existingKey = apiKeys.find((k: UserApiKey) => k.modelId === model.id);
    if (existingKey) {
      setEditingKeyId(existingKey.id);
      setAlias(existingKey.alias || "");
      // 显示脱敏的 API Key，提示用户这是已配置的 Key
      setApiKey(existingKey.keyMask || "");
      // 如果别名看起来像模型名称（包含模型相关关键词），则作为自定义模型名
      const keyAlias = existingKey.alias || "";
      const isModelName = keyAlias.toLowerCase().includes("seedance") || keyAlias.toLowerCase().includes("doubao") || keyAlias.toLowerCase().includes("kling") || keyAlias.toLowerCase().includes("mini");
      if (isModelName && keyAlias !== model.id) {
        setCustomModelName(keyAlias);
      } else {
        setCustomModelName("");
      }
    } else {
      setEditingKeyId(null);
      setAlias("");
      setApiKey("");
      setCustomModelName("");
    }
  };

  const handleSave = () => {
    if (!configuringModel) return;
    if (editingKeyId) {
      const data: { apiKey?: string; alias?: string } = {};
      if (alias.trim()) data.alias = alias.trim();
      // 只有当 API Key 不是脱敏格式时才更新（避免用脱敏值覆盖真实 Key）
      if (apiKey.trim() && !apiKey.includes("****")) {
        data.apiKey = apiKey.trim();
      }
      updateKeyMutation.mutate({ id: editingKeyId, data });
    } else {
      if (!apiKey.trim() || apiKey.includes("****")) return;
      createKeyMutation.mutate({ modelId: configuringModel.id, apiKey: apiKey.trim(), alias: alias.trim() || `${configuringModel.name} Key`, isDefault: true });
    }
  };

  const isPending = editingKeyId ? updateKeyMutation.isPending : createKeyMutation.isPending;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-mid border border-divider text-text-secondary hover:text-white transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg> 返回
        </button>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-white mb-1">模型中心</h1>
          <p className="text-text-secondary">配置各厂商 AI 模型的 API Key，所有配置会在创作流程中直接可用</p>
        </div>
      </div>

      <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-anime-purple/5 to-panel-mid border border-divider">
        <h3 className="font-display text-lg font-bold text-white mb-4">🎯 功能与模型对照</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(capabilityConfig).map(([key, c]) => (
            <div key={key} className={`p-4 rounded-lg border ${c.color}`}>
              <div className="flex items-center gap-2 mb-2"><span className="text-lg">{c.icon}</span><h4 className="text-sm font-medium">{c.name}</h4></div>
              <p className="text-xs opacity-80">{c.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-xl font-bold text-white mb-4">成本概览</h2>
        <CostPanel />
      </div>

      {/* API Key 使用详情 */}
      <div className="mb-8">
        <h2 className="font-display text-xl font-bold text-white mb-4">API Key 使用详情</h2>
        {apiKeys.length === 0 ? (
          <div className="p-6 rounded-xl bg-panel-deep border border-divider text-center">
            <p className="text-text-secondary">暂未配置任何 API Key</p>
            <p className="text-xs text-text-disabled mt-1">请在下方模型配置区域配置至少一个 API Key</p>
          </div>
        ) : (
          <div className="rounded-xl bg-panel-deep border border-divider overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-divider text-xs font-medium text-text-secondary">
              <div className="col-span-3">模型</div>
              <div className="col-span-2">能力</div>
              <div className="col-span-2">Key 脱敏</div>
              <div className="col-span-2">状态</div>
              <div className="col-span-2">调用次数</div>
              <div className="col-span-1">操作</div>
            </div>
            {apiKeys.map((key: UserApiKey & { modelName?: string; capability?: string }) => (
              <div key={key.id} className="grid grid-cols-12 gap-4 p-4 border-b border-divider last:border-b-0 items-center">
                <div className="col-span-3">
                  <p className="text-sm font-medium text-white">{key.modelName || key.modelId}</p>
                  <p className="text-xs text-text-secondary">{key.alias}</p>
                </div>
                <div className="col-span-2">
                  <Badge variant="info" className="text-[10px]">
                    {capabilityConfig[key.capability as keyof typeof capabilityConfig]?.name || key.capability}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-mono text-text-secondary">{key.keyMask}</span>
                </div>
                <div className="col-span-2">
                  <Badge variant={key.status === "valid" ? "success" : "warning"}>{key.status === "valid" ? "有效" : "无效"}</Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-text-secondary">{key.totalCalls || 0} 次</span>
                </div>
                <div className="col-span-1">
                  <Button size="sm" variant="ghost" className="text-xs text-warm-orange" onClick={() => {
                    const model = models.find((m) => m.id === key.modelId);
                    if (model) handleOpenConfig(model);
                  }}>
                    编辑
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="font-display text-xl font-bold text-white mb-6">模型配置</h2>
      {modelsLoading || keysLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{[1, 2, 3].map((i) => <Card key={i} className="h-48 animate-pulse bg-panel-deep" />)}</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedModels).map(([provider, capabilities]) => {
            const info = providerConfig[provider] || { name: provider, icon: "🤖", website: "#", description: provider };
            const allModels = Object.values(capabilities).flat();
            const configuredCount = allModels.filter((m) => apiKeys.some((k: UserApiKey) => k.modelId === m.id)).length;

            return (
              <motion.div key={provider} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-panel-deep border border-divider overflow-hidden">
                <div className="p-6 border-b border-divider">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-panel-mid flex items-center justify-center text-2xl">{info.icon}</div>
                      <div><h3 className="font-display text-lg font-bold text-white">{info.name}</h3><p className="text-sm text-text-secondary">{info.description}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={configuredCount > 0 ? "success" : "warning"}>{configuredCount > 0 ? `已配置 ${configuredCount}` : "未配置"}</Badge>
                      <a href={info.website} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-anime-purple transition-colors"><ExternalLinkIcon className="w-4 h-4" /></a>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-3">
                    {allModels.map((model) => {
                      const { status, keyMask } = getStatus(model.id, apiKeys);
                      const cap = capabilityConfig[model.capability];
                      return (
                        <motion.div key={model.id} whileHover={{ scale: 1.02 }} className="flex-1 min-w-[250px] max-w-[350px] p-4 rounded-lg bg-panel-mid border border-divider hover:border-anime-purple/30 transition-all cursor-pointer" onClick={() => handleOpenConfig(model)}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">{cap?.icon || '🤖'}</span>
                            <Badge variant={status === "configured" ? "success" : "warning"} className="text-[10px]">{cap?.name || model.capability}</Badge>
                          </div>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1"><p className="text-sm font-medium text-white">{model.name}</p><p className="text-xs text-text-secondary line-clamp-2 mt-1">{model.description}</p></div>
                            <Badge variant={status === "configured" ? "success" : "warning"} className="ml-2 flex-shrink-0">{status === "configured" ? "已配置" : "未配置"}</Badge>
                          </div>
                          {status === "configured" && keyMask && (
                            <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded bg-panel-deep border border-divider"><CheckIcon className="w-3 h-3 text-neon-cyan" /><span className="text-xs text-text-secondary font-mono">{keyMask}</span></div>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-text-disabled">{formatPrice(model.billingRule)}</span>
                            <Button size="sm" variant={status === "configured" ? "secondary" : "primary"} className="text-xs" onClick={(e) => { e.stopPropagation(); handleOpenConfig(model); }}>{status === "configured" ? "编辑" : "配置"}</Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {configuringModel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm" onClick={() => closeConfig()}>
            <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-panel-deep border-l border-divider shadow-2xl overflow-y-auto">
              <div className="p-6 border-b border-divider">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold text-white">{configuringModel.name}</h3>
                    <p className="text-sm text-text-secondary">{providerConfig[configuringModel.provider]?.name || configuringModel.provider} · {capabilityConfig[configuringModel.capability]?.name || configuringModel.capability}</p>
                  </div>
                  <button onClick={() => closeConfig()} className="text-text-secondary hover:text-white">✕</button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-4 rounded-lg bg-panel-mid border border-divider">
                  <p className="text-sm text-text-secondary">{configuringModel.description}</p>
                  {configuringModel.docUrl && (
                    <a href={configuringModel.docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-anime-purple hover:underline mt-2">查看官方文档 <ExternalLinkIcon className="w-3 h-3" /></a>
                  )}
                </div>
                <ParameterFields
                  parameters={configuringModel.parameters as ModelParameter[] | undefined}
                  customModelName={customModelName}
                  onCustomModelNameChange={setCustomModelName}
                />
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">API Key</label>
                    <Input
                      type={editingKeyId && apiKey.includes("****") ? "text" : "password"}
                      placeholder={editingKeyId ? "已配置的 Key（留空则不更新）" : "sk-..."}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    {editingKeyId && apiKey.includes("****") && (
                      <p className="text-[10px] text-text-disabled mt-1">当前显示的是脱敏后的 Key，如需更新请输入新的完整 Key</p>
                    )}
                  </div>
                  <div><label className="block text-sm font-medium text-text-secondary mb-2">Key 别名</label><Input placeholder="例如：我的主 Key" value={alias} onChange={(e) => setAlias(e.target.value)} /></div>
                </div>
                <div className="p-4 rounded-lg bg-panel-mid/50 border border-divider">
                  <p className="text-sm text-text-secondary mb-1">参考价格</p>
                  <p className="text-white font-medium">{formatPrice(configuringModel.billingRule)}</p>
                </div>
                <div className="flex gap-3">
                  {editingKeyId && (
                    <Button variant="outline" className="flex-1 text-warm-orange border-warm-orange/30 hover:bg-warm-orange/10" onClick={() => setShowDeleteConfirm(true)}>删除</Button>
                  )}
                  <Button className="flex-1 gap-2" onClick={handleSave} disabled={(!editingKeyId && !apiKey.trim()) || isPending} isLoading={isPending}>
                    <CheckIcon className="w-4 h-4" />
                    {isPending ? (editingKeyId ? "更新中..." : "验证中...") : (editingKeyId ? "更新配置" : "验证并保存")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete API Key Confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { if (editingKeyId) deleteKeyMutation.mutate(editingKeyId); }}
        title="确认删除 API Key"
        description="删除后需要重新配置才能使用该模型，确定要删除吗？"
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}
