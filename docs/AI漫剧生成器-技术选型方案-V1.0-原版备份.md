# AI 漫剧生成器 技术选型方案

> 版本：V1.0  
> 日期：2026-06-29  
> 目标：为 AI 漫剧生成器（PC Web）选择合适的技术栈，支撑"用户自选模型 + 自有 API Key"的多模型创作编排平台

---

## 一、选型原则

| 原则 | 说明 |
|------|------|
| 开放可扩展 | 新模型、新能力可低成本接入，不绑定特定供应商 |
| 用户主权 | 支持用户自带 API Key，平台不强制托管模型 |
| 安全可靠 | API Key 加密存储、调用鉴权、内容安全 |
| 高性能 | 长耗时生成任务异步处理，支持并发和队列 |
| 可维护 | 团队熟悉、社区活跃、文档完善 |
| 成本可控 | 优先开源/免费方案，商业化组件按需引入 |

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层（PC Web）                         │
│  Next.js 14 (App Router) + React + TypeScript + Tailwind CSS   │
│  ├─ 创作工作区：角色设计、故事编排、分镜、镜头、视频生成、后期合成 │
│  ├─ 模型商店 + API Key 配置                                      │
│  └─ 项目管理中心                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API / WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                         后端服务层                               │
│  Node.js + NestJS / 或 Python + FastAPI                         │
│  ├─ API Gateway：路由、鉴权、限流                                 │
│  ├─ 业务服务：项目、角色、分镜、提示词、任务                      │
│  ├─ 模型适配器层：统一封装各 AI 模型 API                          │
│  ├─ 任务队列：异步视频/图像生成                                   │
│  └─ 文件存储：素材、生成结果管理                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │ 数据库   │    │ 缓存/队列│    │ 对象存储 │
        │  MySQL  │    │  Redis  │    │  MinIO  │
        │+ Prisma │    │+ BullMQ │    │ / S3    │
        └─────────┘    └─────────┘    └─────────┘
```

---

## 三、前端技术选型

### 3.1 框架与语言

| 技术 | 选择 | 说明 |
|------|------|------|
| 框架 | **Next.js 14+ (App Router)** | React 生态主流，支持 SSR/SSG/API Routes，部署方便 |
| 语言 | **TypeScript** | 类型安全，提升大型项目可维护性 |
| UI 样式 | **Tailwind CSS** | 原子化 CSS，快速实现暗色设计系统 |
| 组件库 | **Radix UI + 自建组件** | 无样式、可访问性好的 Headless 组件，便于自定义主题 |
| 状态管理 | **Zustand + React Query (TanStack Query)** | Zustand 管理客户端状态，React Query 管理服务端状态 |
| 路由 | Next.js App Router | 内置文件系统路由，无需额外路由库 |
| 表单 | **React Hook Form + Zod** | 表单处理与校验 |

### 3.2 可视化与媒体处理

| 技术 | 选择 | 说明 |
|------|------|------|
| 时间线组件 | **自研 / @xstate/react + canvas/DOM** | 后期合成时间线需要高度定制，建议自研核心轨道 |
| 视频播放 | **Plyr / Video.js** 或原生 HTML5 video | 预览生成结果 |
| 图片展示 | Next.js Image | 优化加载 |
| 拖拽排序 | **@dnd-kit** | 分镜卡片拖拽排序 |
| 代码高亮 | Prism.js / highlight.js | API Key、提示词展示（可选） |

### 3.3 动画与动效

| 技术 | 选择 | 说明 |
|------|------|------|
| 动画库 | **Framer Motion** | React 友好，适合页面切换、卡片 hover、选中脉冲 |
| 进度动画 | CSS animation + Framer Motion | 胶片齿孔进度条 |

---

## 四、后端技术选型

### 4.1 主语言与框架

| 方案 | 选择 | 说明 |
|------|------|------|
| 主框架 | **NestJS (Node.js + TypeScript)** | 企业级框架，模块化、依赖注入、TypeScript 全栈一致 |
| 备选 | FastAPI (Python) | 如果团队更熟悉 Python，或需要更多 AI/ML 原生库支持 |

推荐 **NestJS**，原因：
- 前后端统一 TypeScript，降低心智负担
- 模块化架构适合多模型 Adapter 扩展
- 与 BullMQ、Redis、Prisma 集成成熟

### 4.2 数据库

| 技术 | 选择 | 说明 |
|------|------|------|
| 关系数据库 | **MySQL 8.0+** | 国内主流，云数据库服务丰富，适合项目/角色/分镜等结构化数据 |
| ORM | **Prisma** | 类型安全、迁移方便、与 NestJS/Next.js 生态配合好 |
| 文件元数据 | PostgreSQL + JSONB | 模型参数、任务结果等半结构化数据用 JSONB 存储 |

### 4.3 缓存与队列

| 技术 | 选择 | 说明 |
|------|------|------|
| 缓存 | **Redis** | 会话、任务状态、热点数据缓存 |
| 任务队列 | **BullMQ** | 基于 Redis，支持延迟、重试、优先级、并发控制 |
| 状态通知 | **WebSocket (Socket.IO)** | 任务进度实时推送给前端 |

### 4.4 文件与对象存储

| 技术 | 选择 | 说明 |
|------|------|------|
| 对象存储 | **MinIO（自建）/ AWS S3 / 阿里云 OSS** | 存储角色图、视频、音频等生成结果 |
| 文件上传 | **Signed URL / 直传** | 大文件建议前端直传到对象存储 |
| CDN | 云厂商 CDN | 加速静态资源访问 |

---

## 五、AI 模型接入层设计

### 5.1 核心设计：Adapter 模式

每个 AI 模型封装为一个 Adapter，统一输入输出接口：

```typescript
// 统一能力接口
interface ModelAdapter {
  readonly provider: string;
  readonly capability: CapabilityType;
  validateKey(apiKey: string): Promise<KeyValidationResult>;
  generate(input: GenerateInput, config: ModelConfig): Promise<GenerateResult>;
  estimateCost(input: GenerateInput): CostEstimate;
}

// 示例：视频生成 Adapter
class KlingVideoAdapter implements ModelAdapter {
  provider = 'kling';
  capability = 'video';
  
  async validateKey(apiKey: string) { /* ... */ }
  async generate(input, config) { /* 调用可灵 API */ }
  estimateCost(input) { /* 按秒/按次计费 */ }
}

class DoubaoVideoAdapter implements ModelAdapter {
  provider = 'doubao';
  capability = 'video';
  
  async validateKey(apiKey: string) { /* ... */ }
  async generate(input, config) { /* 调用豆包 API */ }
  estimateCost(input) { /* ... */ }
}
```

### 5.2 模型配置化

模型信息通过配置文件或数据库管理，新增模型只需：
1. 实现对应 Adapter
2. 在模型注册表中添加配置
3. 前端模型商店自动展示

### 5.3 首批接入模型建议

| 能力环节 | 首批接入模型 | 备注 |
|---------|------------|------|
| LLM | DeepSeek-V3、Kimi、OpenAI GPT-4o | 中文效果好，用户基数大 |
| 图像生成 | FLUX（Replicate/本地）、即梦、通义万相 | 角色图生成 |
| 视频生成 | 可灵 Kling、豆包 PixelDance/Seaweed | 国内主流，效果较好 |
| TTS | ElevenLabs、豆包语音、讯飞 | 多音色 |
| 音乐 | Suno、Udio | 背景音乐 |
| 音效 | ElevenLabs Sound Effects | 环境音效 |

---

## 六、安全与部署

### 6.1 API Key 安全

| 措施 | 技术 |
|------|------|
| 传输加密 | HTTPS/TLS 1.3 |
| 存储加密 | AES-256-GCM + KMS/环境密钥 |
| 密钥轮换 | 支持用户更新 Key，旧 Key 失效 |
| 访问审计 | 记录 Key 增删改查 |
| 调用限流 | Redis + Rate Limiter |

### 6.2 部署方案

| 层级 | 方案 |
|------|------|
| 前端 | Vercel / 自有服务器 + Nginx |
| 后端 | Docker + Kubernetes / 云服务器 |
| 数据库 | 云 MySQL 8.0+（AWS RDS / 阿里云 RDS） |
| Redis | 云 Redis 服务 |
| 对象存储 | MinIO / S3 / OSS |
| CI/CD | GitHub Actions + Docker |

---

## 七、开发工具与规范

| 类别 | 选择 |
|------|------|
| 代码编辑器 | VS Code |
| 包管理 | pnpm |
| 代码规范 | ESLint + Prettier |
| 提交规范 | Conventional Commits |
| API 文档 | Swagger / OpenAPI |
| 测试 | Vitest（前端）+ Jest（后端） |
| 类型共享 | 前后端共享 TypeScript 类型定义 |

---

## 八、技术栈总览

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14 + React + TypeScript |
| 前端样式 | Tailwind CSS + Radix UI |
| 前端状态 | Zustand + TanStack Query |
| 后端框架 | NestJS (Node.js) |
| 数据库 | MySQL 8.0+ + Prisma |
| 缓存/队列 | Redis + BullMQ |
| 实时通信 | Socket.IO |
| 对象存储 | MinIO / S3 / OSS |
| 部署 | Docker + Kubernetes / Vercel |
| AI 接入 | Adapter 模式，首批接入可灵、豆包、DeepSeek、FLUX 等 |

---

## 九、风险与备选

| 风险 | 备选方案 |
|------|----------|
| 视频生成 API 不稳定 | 多模型适配 + 自动重试 + 切换 |
| 用户 API Key 泄露 | 服务端调用、加密存储、审计日志 |
| 长视频生成超时 | 异步队列 + WebSocket 进度推送 |
| 大文件上传慢 | 前端直传对象存储 + 分片上传 |
| 团队不熟悉 NestJS | 改为 FastAPI + Python |

---

*文档版本：V1.0*  
*作者：技术架构 Agent*  
*日期：2026-06-29*
