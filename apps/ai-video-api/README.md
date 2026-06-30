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
