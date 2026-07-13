# 贡献指南

感谢你对 **AI 漫剧创作台** 的关注！在动手之前，请花两分钟看完这份文档，会让你的 PR 更容易被合并。

## 🚀 快速开始

1. **Fork** 本仓库并 clone 到本地
2. 建立开发分支：`git checkout -b feat/xxx` 或 `fix/xxx` / `docs/xxx`
3. 按照 [根目录 README](README.md) 中"快速开始"章节配置本地环境
4. 提交你的改动，推到 fork，发起 Pull Request

## 🌿 分支与提交规范

### 分支命名

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/openai-compatible-adapter` |
| `fix/` | Bug 修复 | `fix/captcha-response-format` |
| `docs/` | 文档改动 | `docs/polish-readmes` |
| `chore/` | 构建 / 依赖 / 杂项 | `chore/add-docker-compose` |
| `refactor/` | 重构，不改变外部行为 | `refactor/adapter-factory` |

### Commit Message

沿用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 风格：

```
<type>(<scope>): <简短说明>
```

- **type**：`feat` / `fix` / `docs` / `chore` / `refactor` / `test` / `perf`
- **scope**（可选）：`api` / `web` / `auth` / `models` / `queue` 等模块名
- **说明**：中文即可，尽量控制在 50 字以内

示例：

```
feat(models): 新增 OpenAI 兼容 Adapter，支持自定义 baseUrl
fix(auth): 验证码接口去掉多余的 data 包装
docs(readme): 修正后端 README 数据库说明
```

### 提交粒度

> 什么是"一个功能模块"：一个独立完整的改动。
> 原则：如果这个改动可以单独回退而不影响其他功能，它就值得单独 commit。

不要把多个不相关的改动堆在一个 commit 里，也不要每改一个文件就 commit。

## 🧪 提交 PR 前的自测清单

- [ ] `pnpm install` 无告警（新增依赖时请说明理由）
- [ ] 后端 `pnpm run lint` 通过（在 `apps/ai-video-api` 目录）
- [ ] 后端 `pnpm run build` 通过
- [ ] 前端 `pnpm run lint` 通过（在 `apps/ai-video-web` 目录）
- [ ] 前端 `pnpm run build` 通过
- [ ] 涉及数据库 schema 时，附带一份可回滚的 `prisma migrate` 迁移文件
- [ ] 涉及新环境变量时，同步更新 `.env.example`
- [ ] 新增/修改公开 API 时，同步更新 Swagger 注解与相关文档
- [ ] PR 描述里写清 **变更内容 / 影响面 / 回滚策略**

## 🔍 代码风格

- 后端：遵循 NestJS + Prettier 默认配置，`pnpm run format` 一键格式化
- 前端：遵循 Next.js ESLint 规则；Tailwind class 顺序按照 UI 组件的既有习惯
- 命名：目录 / 文件用 kebab-case（如 `create-project.dto.ts`），类用 PascalCase，变量与函数用 camelCase
- 注释：优先解释"为什么"，而不是"做了什么"。业务侧的关键决策点欢迎中文注释

## 🗣️ 讨论与反馈

- **Bug 报告**：使用 [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) 模板
- **功能提案**：使用 [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) 模板
- **安全漏洞**：请参考 [SECURITY.md](SECURITY.md)，**不要**在公开 Issue 中披露

## 🙏 感谢

每一份 PR、每一个 Issue、每一次讨论都在让这个项目变得更好。期待你的贡献！