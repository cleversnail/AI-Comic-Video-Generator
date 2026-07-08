# AI 漫剧创作台 技术选型方案 V2.0

> 版本：V2.0  
> 日期：2026-06-29  > 目标：为 AI 漫剧创作台选择合适的技术栈，支撑"极速模式优先、模型中立、用户自带 API Key"的多模型创作编排平台

---

## 一、选型原则

| 原则 | 说明 |
|------|------|
| 开放可扩展 | 新模型、新能力可低成本接入，不绑定特定供应商 |
| 用户主权 | 支持用户自带 API Key，平台不强制托管模型 |
| 安全可靠 | API Key 加密存储、调用鉴权、内容安全 |
| 高性能 | 长耗时生成任务异步处理，支持并发和队列 |
| 可维护 | 团队熟悉、社区活跃、文档完善 |
| 边界清晰 | Next.js 与 NestJS 职责明确，避免双后端混乱 |

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层（PC Web）                         │
│  Next.js 14 (App Router) + React + TypeScript + Tailwind CSS   │
│  ├─ 页面渲染、用户交互、表单、前端状态                            │
│  ├─ 基础 auth 跳转、极少量必要代理                                │
│  └─ 不处理核心业务 API                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API / WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                         业务 API 层                              │
│  NestJS + TypeScript                                            │
│  ├─ 项目、角色、分镜、提示词、任务业务                            │
│  ├─ 模型适配器层：LLM / Image / Video / TTS / Music / Sound     │
│  ├─ API Key 加密存储与验证                                       │
│  ├─ 任务队列创建与管理                                           │
│  ├─ 权限控制与审计                                               │
│  └─ 文件记录与元数据管理                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │ 数据库   │    │ 缓存/队列│    │ 对象存储 │
        │  MySQL  │    │  Redis  │    │  MinIO  │
        │+ Prisma │    │+ BullMQ │    │ / S3    │
        └─────────┘    └─────────┘    └─────────┘
                              │
                              ▼
        ┌──────────────────────────────────────────────────────┐
        │                    Worker 层                          │
        │  执行长耗时 AI 任务、轮询第三方结果、处理回调、        │
        │  下载/转存产物到对象存储、WebSocket 推送进度           │
        └──────────────────────────────────────────────────────┘
```

---

## 三、前端技术选型

### 3.1 框架与语言

| 技术 | 选择 | 说明 |
|------|------|------|
| 框架 | **Next.js 14+ (App Router)** | React 生态主流，支持 SSR/SSG/API Routes |
| 语言 | **TypeScript** | 类型安全，提升可维护性 |
| UI 样式 | **Tailwind CSS** | 原子化 CSS，快速实现暗色设计系统 |
| 组件库 | **Radix UI + 自建组件** | Headless 组件，便于自定义主题 |
| 状态管理 | **Zustand + TanStack Query** | Zustand 客户端状态，React Query 服务端状态 |
| 路由 | Next.js App Router | 内置文件系统路由 |
| 表单 | **React Hook Form + Zod** | 表单处理与校验 |
| 动画 | **Framer Motion** | 页面切换、卡片动画、选中脉冲 |
| 拖拽排序 | **@dnd-kit** | 分镜卡片拖拽排序 |
| WebSocket | **Socket.IO Client** | 任务进度实时推送 |

---

## 四、后端技术选型

### 4.1 主框架

| 技术 | 选择 | 说明 |
|------|------|------|
| 主框架 | **NestJS 10 (Node.js + TypeScript)** | 模块化、依赖注入、与队列/ORM 集成成熟 |
| ORM | **Prisma 6.x** | 类型安全、迁移方便 |
| 数据库 | **MySQL 8.0+** | 国内主流，云数据库服务丰富 |
| 缓存/队列 | **Redis + BullMQ** | 异步任务、进度通知、限流 |
| 实时通信 | **Socket.IO** | 任务进度推送给前端 |
| 对象存储 | **MinIO / S3 / OSS** | 用户素材与 AI 生成产物存储 |

### 4.2 NestJS 与 Next.js 边界（V2.0 明确）

| 层 | 职责 |
|---|---|
| Next.js | 页面渲染、前端状态、表单、用户交互、基础 auth 跳转 |
| NestJS | 所有业务 API、模型调用、任务创建、Key 加密、文件记录、权限控制 |
| Worker | 执行长耗时 AI 任务、轮询第三方结果、处理回调、写入对象存储 |

约定：
- Next.js 不写核心业务 API
- Next.js API Routes 只保留极少量必要代理或健康检查
- 所有项目、角色、分镜、模型、任务相关 API 都走 NestJS

---

## 五、AI 模型接入层设计

### 5.1 Adapter 按能力拆分（V2.0 核心变化）

不再使用单一 `ModelAdapter`，而按能力拆分为多个接口族：

```typescript
type CapabilityType = 'llm' | 'image' | 'video' | 'tts' | 'music' | 'sound';

interface BaseAdapter {
  provider: string;
  modelId: string;
  validateKey(apiKey: string): Promise<KeyValidationResult>;
}

interface LLMAdapter extends BaseAdapter {
  generateText(input: LLMInput, config: LLMConfig): Promise<LLMResult>;
}

interface ImageAdapter extends BaseAdapter {
  generateImage(input: ImageInput, config: ImageConfig): Promise<ImageResult>;
}

interface VideoAdapter extends BaseAdapter {
  generateVideo(input: VideoInput, config: VideoConfig): Promise<VideoTaskResult>;
  getVideoTaskStatus(taskId: string): Promise<VideoTaskStatus>;
}

interface TTSAdapter extends BaseAdapter {
  synthesize(input: TTSInput, config: TTSConfig): Promise<AudioResult>;
}
```

上层通过工厂路由：
```typescript
adapterFactory.getAdapter(capability, modelId)
```

### 5.2 模型配置化

模型信息通过配置文件或数据库管理，新增模型只需：
1. 实现对应 Adapter
2. 在模型注册表中添加配置
3. 前端模型中心自动展示

### 5.3 首批接入模型

| 能力环节 | 首批接入模型 |
|---------|------------|
| LLM | DeepSeek-V3、OpenAI Compatible |
| 图像生成 | Replicate FLUX、通义万相/即梦 |
| 视频生成 | 可灵 Kling、豆包/即梦 |
| TTS | ElevenLabs、豆包语音/MiniMax |
| 合成 | FFmpeg |

---

## 六、文件链路设计

### 6.1 用户素材链路

适用于：用户上传角色参考图、背景图、音频素材、已有视频片段。

```text
前端申请 signed URL
    ↓
前端直传对象存储
    ↓
前端通知后端写入文件记录
    ↓
后端绑定到项目 / 角色 / 分镜
```

### 6.2 AI 生成产物链路

适用于：角色图、分镜静态预览图、视频片段、TTS 音频、音乐/音效。

```text
用户创建生成任务
    ↓
后端写入 GenerationTask
    ↓
BullMQ Worker 调用第三方模型
    ↓
模型返回结果 URL 或任务 ID
    ↓
Worker 下载/转存到对象存储，或接收模型回调
    ↓
更新任务状态和文件记录
    ↓
WebSocket 推送前端进度
```

---

## 七、安全与部署

### 7.1 API Key 安全

| 措施 | 技术 |
|------|------|
| 传输加密 | HTTPS/TLS 1.3 |
| 存储加密 | AES-256-GCM + KMS/环境密钥 |
| 日志脱敏 | 不记录完整 Key |
| 前端展示 | 只展示脱敏 Key |
| 访问控制 | 用户只能访问自己的 Key |
| 调用方式 | 服务端统一调用，不暴露给前端 |

### 7.2 部署方案

| 层级 | 方案 |
|------|------|
| 前端 | Vercel / 自有服务器 + Nginx |
| 后端 | Docker + Kubernetes / 云服务器 |
| 数据库 | 云 MySQL 8.0+ |
| Redis | 云 Redis 服务 |
| 对象存储 | MinIO / S3 / OSS |
| Worker | 独立进程或容器 |
| CI/CD | GitHub Actions + Docker |

---

## 八、开发工具与规范

| 类别 | 选择 |
|------|------|
| 包管理 | pnpm |
| 代码规范 | ESLint + Prettier |
| 提交规范 | Conventional Commits |
| API 文档 | Swagger / OpenAPI |
| 测试 | Vitest（前端）+ Jest（后端） |
| 类型共享 | 前后端共享 TypeScript 类型定义 |

---

## 九、技术栈总览

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14 + React + TypeScript |
| 前端样式 | Tailwind CSS + Radix UI |
| 前端状态 | Zustand + TanStack Query |
| 后端框架 | NestJS 10 (Node.js) |
| 数据库 | MySQL 8.0+ + Prisma 6.x |
| 缓存/队列 | Redis + BullMQ |
| 实时通信 | Socket.IO |
| 对象存储 | MinIO / S3 / OSS |
| Worker | NestJS 独立进程 / 容器 |
| AI 接入 | 按能力拆分的 Adapter 模式 |
| 合成 | FFmpeg |

---

## 十、风险与应对

| 风险 | 说明 | 应对 |
|------|------|------|
| 用户流程太重 | 8 步流程容易流失 | 默认极速模式，专业模式后置 |
| 角色一致性难落地 | 不同模型参考图能力差异大 | 分层策略 + 角色变体 + 锁定强度 |
| 视频生成成本高、反馈慢 | 用户反复试错成本高 | 先静态预览，再生成视频 |
| API Key 安全风险 | 用户 Key 泄露会严重影响信任 | 服务端加密、日志脱敏、权限隔离 |
| 多模型适配复杂 | 每个模型参数和任务机制不同 | 按能力拆分 Adapter，先少量模型打通 |
| Next.js/NestJS 边界混乱 | 双层架构可能导致逻辑分散 | 明确 Next 只做 UI，业务 API 全走 NestJS |
| 音画不同步 | 视频后配音会反复返工 | 台词/字幕/时长前置 |
| 纯黑 UI 编辑疲劳 | 长文本输入不舒服 | 编辑区使用中灰背景 |

---

*文档版本：V2.0*  
*作者：技术架构 Agent*  > 日期：2026-06-29
