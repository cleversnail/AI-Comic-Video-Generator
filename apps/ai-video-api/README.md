# AI 漫剧生成器 - 后端 API

## 技术栈
- NestJS 10
- TypeScript
- Prisma + PostgreSQL
- Redis + BullMQ
- Socket.IO
- MinIO / S3

## 启动

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的配置

# 启动开发服务器
pnpm run start:dev
```

API 地址：http://localhost:3001
Swagger 文档：http://localhost:3001/api/docs


启动成功后：

- API 根：<http://localhost:3001>
- Swagger 文档：<http://localhost:3001/api/docs>

## 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm run start:dev` | 开发模式（watch 重启） |
| `pnpm run start:prod` | 生产模式，需先执行 `pnpm run build` |
| `pnpm run build` | 编译到 `dist/` |
| `pnpm run test` | 运行 Jest 单测 |
| `pnpm run test:e2e` | 运行端到端测试 |
| `pnpm run lint` | ESLint 检查并自动修复 |
| `pnpm run db:seed` | 灌入内置的 AI 模型元数据 |

## 模块概览

```
src/modules/
├── auth/         # JWT 鉴权 + svg-captcha 图形验证码
├── models/       # AI 模型中心 + 用户 API Key (AES-256-GCM)
├── projects/     # 项目 CRUD
├── storyboard/   # AI 分镜生成 + 剧本导入（TXT/DOCX/PDF）+ 关键帧
├── characters/   # 角色管理（四视图 / 变体 / lockLevel）
├── generations/  # 生成任务 API
├── compose/      # FFmpeg 合成导出
├── queue/        # BullMQ 生产者与 Worker
└── storage/      # MinIO / S3 上传下载
```

适配器工厂 `src/common/adapters/adapter.factory.ts` 负责按 `modelId` 分发到具体模型：目前已注册
`deepseek-v3 / flux / kling-image / kling-pro / minimax-tts`。

## 排错提示

- **`prisma migrate` 报字符集错误**：请确认 MySQL 使用 `utf8mb4`。
- **BullMQ 连接超时**：优先检查 `REDIS_URL`，`ioredis` 默认不会读 `.env.example` 里的注释行。
- **`STORAGE_*` 相关 500**：本地未启动 MinIO 时，可先注释掉调用存储服务的路径，或使用 [MinIO Docker](https://hub.docker.com/r/minio/minio) 起一个。

## 相关文档

- 产品方案 / 技术选型 / 路线图见 [`../../docs/`](../../docs/)
- 提交规范见 [`../../CLAUDE.md`](../../CLAUDE.md)
