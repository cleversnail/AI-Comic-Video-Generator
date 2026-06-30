# 模型与 API Key 管理模块 PRD V2.0

> 所属产品：AI 漫剧创作台（PC Web）  
> 版本：V2.0  
> 模块定位：支持用户自主选择各环节 AI 模型，并自行配置对应 API Key 的能力中枢  
> 日期：2026-06-29

---

## 一、模块概述

### 1.1 设计原则变化
V2.0 的核心变化：
1. **模型商店和 API Key 配置合并**：在模型详情页直接完成 Key 配置
2. **默认只暴露项目级配置**：全局默认作为后台兜底
3. **任务级切换属于高级功能**：P1/P2 再暴露
4. **弱化"设置页"概念**：模型配置应内嵌在创作流程中

### 1.2 用户真实路径
```
用户在视频生成页选择"可灵 Kling"
    ↓
如果未配置 Key
    ↓
弹出模型详情 / Key 配置面板
    ↓
展示：模型介绍、适用场景、价格说明、官方获取 Key 链接
    ↓
用户粘贴 Key，点击验证
    ↓
验证通过后直接用于当前项目
```

---

## 二、支持的 AI 能力环节

| 能力环节 | 环节 ID | 用途 | 首批模型 |
|---------|--------|------|---------|
| 大语言模型 | llm | 剧情润色、分镜拆分、提示词优化、角色描述 | DeepSeek-V3、OpenAI Compatible |
| 图像生成 | image | 生成角色图、分镜预览图 | Replicate FLUX、通义万相/即梦 |
| 视频生成 | video | 按分镜生成视频片段 | 可灵 Kling、豆包/即梦 |
| 语音合成 | tts | 将文字转为配音 | ElevenLabs、豆包语音/MiniMax |
| 音乐生成 | music | 生成背景音乐 | Suno、Udio（P1） |
| 音效生成 | sound | 生成环境音效 | ElevenLabs Sound Effects（P1） |

---

## 三、配置层级

```
任务级配置 > 项目级配置 > 全局默认配置
```

UI 暴露策略：
- **P0**：只暴露项目级配置
- **P1**：在高级设置中暴露全局默认
- **P2**：在单任务弹窗中暴露任务级临时切换

### 项目级配置默认入口
用户在创作工作台点击"模型状态"或首次触发需要模型的操作时，弹出项目级模型配置面板：

```
当前项目模型配置
─────────────────
大语言模型：   [ DeepSeek-V3 ▼ ]
图像生成：     [ FLUX.1 ▼ ]
视频生成：     [ 可灵 Kling Pro ▼ ]
语音合成：     [ ElevenLabs ▼ ]

[ 保存配置 ]
```

如果某个模型未配置 Key，下拉框旁显示"⚠️ 需配置"，点击后展开该模型详情和 Key 配置。

---

## 四、功能清单

### 4.1 模型中心 `/settings/models`

V2.0 的定位：一个独立的模型浏览和 Key 管理页面，但不应是用户配置模型的唯一入口。

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 模型列表 | 按能力环节展示可选模型 | P0 |
| 模型详情 | 能力、场景、文档、价格说明，内嵌 Key 配置 | P0 |
| 模型搜索/筛选 | 按名称、能力筛选 | P1 |
| API Key 添加 | 在模型详情页直接添加 Key | P0 |
| API Key 验证 | 调用模型官方接口验证 Key | P0 |
| API Key 编辑/删除 | 修改别名、替换 Key、删除 | P1 |
| Key 加密存储 | 服务端加密，不落日志 | P0 |
| Key 脱敏展示 | 只展示 mask，如 sk-****1234 | P0 |

### 4.2 内嵌模型配置（创作流程中）

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 项目级模型配置面板 | 在创作工作台快速配置当前项目使用的模型 | P0 |
| 未配置 Key 引导 | 用户选择未配置模型时，自动弹出配置抽屉 | P0 |
| 模型详情抽屉 | 展示模型介绍、价格、官方链接、Key 配置 | P0 |
| 验证状态反馈 | 验证成功/失败即时反馈 | P0 |

### 4.3 任务路由与执行

| 功能点 | 说明 | 优先级 |
|--------|------|--------|
| 任务分发 | 根据任务类型和项目配置路由到对应模型 | P0 |
| 异步队列 | 长耗时任务进入 BullMQ 队列 | P0 |
| 失败重试 | 网络或模型异常时自动重试 | P1 |
| 切换模型重试 | 失败后提示切换模型或自动切换备用模型 | P1 |
| 进度回调 | WebSocket 推送任务进度 | P0 |

---

## 五、页面原型结构

### 5.1 模型中心总览页

```
┌─────────────────────────────────────────────────────────────────┐
│  AI 漫剧创作台  >  模型中心                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [ 全部 ] [ 大语言 ] [ 图像 ] [ 视频 ] [ 语音 ] [ 音乐 ] [ 音效 ]  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DeepSeek-V3                           ✅ 已配置          │   │
│  │  大语言模型 · 中文成本低 · 速度快                         │   │
│  │  Key: sk-****4567                                          │   │
│  │  [ 编辑配置 ] [ 查看文档 ]                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  可灵 Kling Pro                        ⚠️ 未配置          │   │
│  │  视频生成 · 国内可用性强 · 效果好                         │   │
│  │  [ 配置 API Key ] [ 查看文档 ]                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 内嵌 Key 配置抽屉

```
┌────────────────────────────────────────┐
│  配置模型 - 可灵 Kling Pro             │
├────────────────────────────────────────┤
│                                        │
│  可灵 Kling Pro                        │
│  视频生成模型 · 适合连续镜头生成        │
│  价格：约 ¥0.1/秒 起                   │
│  [ 去官方获取 API Key → ]              │
│                                        │
│  ───────────────────────────────────── │
│                                        │
│  API Key：                             │
│  [ sk-******************************** ]│
│                                        │
│  Key 别名：                            │
│  [ 我的可灵主 Key ]                    │
│                                        │
│  默认参数：                            │
│  分辨率： [ 1080p ▼ ]                  │
│  时长：   [ 5 秒 ▼ ]                   │
│  运动幅度：[ 中 ▼ ]                    │
│                                        │
│  [ 验证 Key ]                          │
│                                        │
│  ✅ 验证通过                           │
│                                        │
│        [ 取消 ]  [ 保存并用于当前项目 ] │
└────────────────────────────────────────┘
```

---

## 六、数据模型

沿用 V1.0 数据模型，重点优化以下字段：

### 6.1 AIModel
增加 `capability` 明确的能力类型字段，避免大统一接口。

```typescript
interface AIModel {
  id: string;
  name: string;
  provider: string;
  capability: 'llm' | 'image' | 'video' | 'tts' | 'music' | 'sound';
  icon?: string;
  description?: string;
  docUrl?: string;
  pricingUrl?: string;
  apiBaseUrl?: string;
  parameters: ModelParameter[];
  supports: {
    referenceImage?: boolean;
    firstFrame?: boolean;
    lastFrame?: boolean;
    batchGeneration?: boolean;
  };
  status: 'active' | 'maintenance' | 'deprecated' | 'beta';
  billingUnit?: 'token' | 'image' | 'second' | 'request';
  billingRule?: BillingRule;
}
```

### 6.2 ModelPreference
V2.0 默认只暴露项目级配置。

```typescript
interface ModelPreference {
  id: string;
  userId: string;
  projectId: string;  // V2.0 必填，默认项目级
  defaults: {
    [capability in CapabilityType]: {
      modelId: string;
      apiKeyId: string;
      parameters: Record<string, any>;
    };
  };
}
```

### 6.3 GenerationTask
增加 `capability` 明确能力类型，便于按能力路由到不同 Adapter。

```typescript
interface GenerationTask {
  id: string;
  capability: CapabilityType;
  modelId: string;
  apiKeyId: string;
  parameters: Record<string, any>;
  input: Record<string, any>;
  status: 'pending' | 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  progress: number;
  result?: Record<string, any>;
  error?: Record<string, any>;
  retryCount: number;
  projectId: string;
  shotId?: string;
}
```

---

## 七、关键交互逻辑

### 7.1 创作流程中配置 Key

```
用户点击"生成视频"或"生成预览"
    │
    ▼
系统检查当前项目的 video 能力是否配置了有效 Key
    │
    ├─ 已配置 → 直接创建任务
    │
    └─ 未配置 → 弹出模型配置抽屉
        │
        ▼
    用户选择视频模型
        │
        ▼
    如果该模型没有已验证的 Key
        │
        ▼
    展开 Key 配置表单
        │
        ▼
    用户粘贴 Key 并验证
        │
        ▼
    验证通过后保存，并继续执行任务
```

### 7.2 任务模型选择逻辑

```
生成任务触发
    │
    ▼
获取任务 capability（如 video）
    │
    ▼
读取项目级 ModelPreference 中该 capability 的 modelId + apiKeyId
    │
    ├─ 项目级已配置 → 使用项目级配置
    │
    └─ 未配置 → 读取全局默认 ModelPreference
        │
        ├─ 全局已配置 → 使用全局配置
        │
        └─ 未配置 → 提示用户先配置模型和 API Key
    │
    ▼
根据 capability + modelId 从 adapterFactory 获取对应 Adapter
    │
    ▼
调用 Adapter.generate() 执行任务
```

---

## 八、安全设计

沿用 V1.0 安全要求，并作为 P0：

| 安全点 | 措施 |
|--------|------|
| 传输加密 | HTTPS，Key 不通过前端明文传输 |
| 存储加密 | AES-256-GCM + KMS/环境密钥 |
| 前端展示 | 永远只展示脱敏 Key |
| 日志脱敏 | 不记录完整 Key |
| 访问控制 | 用户只能查看/编辑自己的 Key |
| 调用方式 | 服务端统一调用模型 API |

---

## 九、验收标准

### P0 必须完成
- [ ] 模型中心展示模型列表和详情
- [ ] 模型详情页内嵌 Key 添加和验证
- [ ] 项目级模型配置面板
- [ ] 未配置 Key 时自动引导配置
- [ ] 生成任务按项目配置路由到对应模型
- [ ] API Key 加密存储，不脱敏不展示
- [ ] 支持至少 2 个 LLM、2 个图像模型、2 个视频模型

### P1 期望完成
- [ ] 全局默认配置
- [ ] 同一模型多 Key 管理
- [ ] 失败自动重试和切换备用 Key
- [ ] 模型搜索/筛选

### P2 加分项
- [ ] 任务级临时切换模型
- [ ] 模型推荐组合
- [ ] 用量统计基础版

---

*文档版本：V2.0*  
*作者：产品规划 Agent*  
*日期：2026-06-29*
