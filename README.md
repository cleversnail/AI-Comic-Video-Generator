# AI 漫剧创作台

> 输入角色和故事，3 分钟得到第一条漫剧草稿

AI 漫剧创作台是一款面向内容创作者的 AI 视频生成工具。用户只需输入角色描述和故事剧情，系统即可自动完成分镜拆解、画面生成、配音合成，最终输出完整的漫剧视频。

## ✨ 核心功能

- **极速模式**：3 步完成第一条漫剧草稿，快速验证创意
- **AI 分镜生成**：输入故事文本，LLM 自动拆分为 4-8 个专业分镜
- **多模型自由组合**：每个环节可选择不同 AI 模型（DeepSeek、FLUX、可灵、ElevenLabs 等）
- **角色一致性管理**：角色提示词库，确保跨分镜形象统一
- **实时预览**：分镜生成后即时预览静态图，支持单镜重生成
- **视频生成队列**：基于 BullMQ 的异步任务系统，支持并发生成
- **合成导出**：FFmpeg 合成最终视频，支持多种分辨率和格式

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│         Next.js 14 + Tailwind CSS               │
│     React Query + Zustand + Framer Motion        │
├─────────────────────────────────────────────────┤
│                   Backend                        │
│              NestJS + Prisma ORM                 │
│   JWT Auth · AES-256-GCM · Global Exception     │
├─────────────────────────────────────────────────┤
│              Infrastructure                      │
│   MySQL · Redis · BullMQ · MinIO/S3             │
├─────────────────────────────────────────────────┤
│              AI Adapters                         │
│   DeepSeek · FLUX · 可灵 · MiniMax TTS          │
└─────────────────────────────────────────────────┘
```

## 📁 项目结构

```
apps/
├── ai-video-api/          # NestJS 后端
│   └── src/
│       ├── modules/
│       │   ├── auth/          # JWT 认证 + 图形验证码
│       │   ├── models/        # 模型管理 + API Key (AES加密)
│       │   ├── projects/      # 项目 CRUD
│       │   ├── storyboard/    # AI 分镜生成 + 脚本导入 + 关键帧
│       │   ├── characters/    # 角色管理（四视图/变体/锁定强度）
│       │   ├── generations/   # 生成任务队列
│       │   ├── compose/       # FFmpeg 合成导出
│       │   ├── queue/         # BullMQ 队列 + Image/Video Worker
│       │   ├── storage/       # MinIO/S3 存储服务
│       │   └── websocket/     # Socket.IO 实时进度推送
│       └── common/
│           ├── adapters/      # AI 模型 Adapter 工厂（LLM/Image/Video/TTS）
│           └── filters/       # 全局异常过滤器
│
└── ai-video-web/          # Next.js 前端
    └── app/
        ├── page.tsx           # 首页（产品介绍 + CTA）
        ├── login/             # 登录/注册
        ├── (workspace)/
        │   ├── projects/      # 项目列表 + 创建
        │   └── [id]/
        │       ├── studio/    # 故事编排工作台（角色/故事/分镜 Tab）
        │       ├── generate/  # 视频生成队列
        │       └── export/    # 后期导出
        └── settings/
            └── models/        # 模型中心（API Key 配置）
├── docs/                   # 项目文档
│   ├── README.md           # 文档索引
│   ├── *.md                # 产品/UI/技术文档
│   └── archive/            # 历史版本备份
└── CLAUDE.md               # Claude Code 项目指令
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- MySQL >= 8.0
- Redis >= 5.0（⚠️ BullMQ 要求 Redis ≥ 5.0，低于此版本队列功能不可用）
- MinIO 或 S3 兼容对象存储（可选，用于素材与产物存储）

### 安装依赖

```bash
# 安装后端依赖
cd apps/ai-video-api
pnpm install

# 安装前端依赖
cd ../ai-video-web
pnpm install
```

### 安装依赖

```bash
# 安装后端依赖
cd apps/ai-video-api
pnpm install

# 安装前端依赖
cd ../ai-video-web
pnpm install
```

### 配置环境变量

```bash
cd apps/ai-video-api
cp .env.example .env
# 编辑 .env 文件，配置数据库、Redis、JWT 密钥等
# 注意：DATABASE_URL 默认使用 "user:password"，需修改为实际数据库凭据
```

### 数据库迁移

```bash
cd apps/ai-video-api
npx prisma migrate dev
npx prisma db seed
```

### 启动服务

```bash
# 启动后端 (http://localhost:3001)
cd apps/ai-video-api
pnpm run start:dev

# 启动前端 (http://localhost:3000)
cd apps/ai-video-web
pnpm run dev
```

## 🔌 API 文档

后端启动后访问 Swagger 文档：http://localhost:3001/api/docs

### 主要 API 端点

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /auth/register` | 注册（需验证码） |
| 认证 | `POST /auth/login` | 登录 |
| 认证 | `GET /auth/captcha` | 获取图形验证码 |
| 项目 | `GET /projects` | 项目列表 |
| 项目 | `POST /projects` | 创建项目 |
| 模型 | `GET /models` | 模型列表（公开） |
| 模型 | `POST /models/api-keys` | 配置 API Key |
| 分镜 | `POST /projects/:id/storyboard/generate` | AI 生成分镜 |
| 分镜 | `POST /projects/:id/storyboard/shots/:shotId/preview` | 生成预览图 |
| 角色 | `GET/POST /projects/:id/characters` | 角色管理 |
| 生成 | `POST /projects/:id/generations` | 创建生成任务 |
| 合成 | `POST /projects/:id/compose` | 合成导出视频 |

## 🛡️ 安全特性

- **JWT 鉴权**：基于 Passport.js 的 JWT 认证策略
- **API Key 加密**：AES-256-GCM 加密存储用户的 AI 模型 API Key
- **图形验证码**：svg-captcha 防止恶意注册
- **频率限制**：注册 3次/分钟、登录 5次/分钟、全局 30次/分钟
- **全局异常处理**：统一捕获 Prisma/HTTP/未知错误，不暴露内部细节

## 🤖 已接入的 AI 模型

| 模型 | 能力 | 用途 |
|------|------|------|
| DeepSeek-V3 | 大语言模型 | 剧情润色、分镜拆分、提示词优化 |
| FLUX.1 | 图像生成 | 角色图、分镜预览图 |
| 可灵 (Kling) | 图像/视频 | 图片生成、视频片段生成 |
| MiniMax TTS | 语音合成 | 中文漫剧配音 |
| ElevenLabs | 语音合成 | 配音、旁白 |

> 注：即梦 (Jimeng) 和 Kimi 已在种子数据中注册但尚未实现完整 Adapter。

## 📋 开发进度

- [x] 阶段一：安全地基（JWT、AES-256-GCM 加密、全局异常处理、频率限制）
- [x] 阶段二：核心链路（BullMQ 队列、AI Adapter 体系、角色管理、StorageService）
- [x] 阶段三：产品化（TTS Adapter、FFmpeg 合成、生成任务 API、WebSocket 实时进度）
- [ ] 角色四视图生成
- [ ] 角色变体系统
- [ ] 分镜角色绑定
- [ ] 故事板阅读模式
- [ ] TTS 配音 + 字幕时间轴
- [ ] 创作助手 Chat 组件
- [ ] 单元测试 + E2E 测试
- [ ] Redis 升级（当前 3.2.100，需要 ≥ 5.0）

> 📊 完整进度详见 [docs/2026-07-30-进度.md](docs/2026-07-30-进度.md)

## 📚 文档索引

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | 文档目录索引 |
| [docs/2026-07-30-进度.md](docs/2026-07-30-进度.md) | 开发进度与待办清单 |
| [docs/AI漫剧生成器产品方案.md](docs/AI漫剧生成器产品方案.md) | 完整产品方案 V2.0 |
| [docs/AI漫剧生成器-UIUX设计规划.md](docs/AI漫剧生成器-UIUX设计规划.md) | UI/UX 设计规范 V2.0 |
| [docs/AI漫剧生成器-技术选型方案.md](docs/AI漫剧生成器-技术选型方案.md) | 技术选型方案 V2.0 |
| [docs/竞品分析与需求改进文档.md](docs/竞品分析与需求改进文档.md) | 竞品分析

## 📄 License

MIT

---

**AI 漫剧创作台** — 让每个人都能用 AI 讲故事
