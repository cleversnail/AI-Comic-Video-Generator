# AI 漫剧创作台 — 分阶段开发路线图

> 版本：V1.0
> 日期：2026-06-30
> 基于：上次审查优化后的代码状态（commit `9c79165`）

---

## 一、上次优化成果回顾

Claude Code 根据上一份审查报告完成了以下改进（`9c79165`）：

| 优化项 | 状态 | 文件 |
|--------|------|------|
| 全局异常过滤器 | ✅ 已实现 | `common/filters/global-exception.filter.ts` |
| 共享 UserService（消除重复 ensureUserExists） | ✅ 已实现 | `modules/common/user.service.ts` |
| AdapterFactory capability 运行时校验 | ✅ 已实现 | `common/adapters/adapter.factory.ts` |
| 分镜生成改用 Adapter（不再裸调 axios） | ✅ 已实现 | `storyboard.service.ts` — `callLLM` 方法 |
| ModelsService/ProjectsService 注入 UserService | ✅ 已实现 | 移除内联 `ensureUserExists` |
| 前端 BackButton 组件 | ✅ 已实现 | `components/navigation/back-button.tsx` |

**当前项目状态**：工程质量债务大幅减少，核心架构趋于规范。但仍处于"骨架完整、肌肉待长"阶段——以下 4 项安全/基建问题仍然是阻塞上线的硬门槛。

---

## 二、剩余阻塞问题（必须在本路线图中解决）

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| 1 | API Key 仍是 Base64 编码，非真加密 | 🔴 安全 | 数据库泄露 = 所有用户 Key 泄露 |
| 2 | 全后端硬编码 `temp-user-id`，无鉴权 | 🔴 安全 | 无法区分用户，无法上线 |
| 3 | 依赖归属混乱（前端库在后端 package.json） | 🟡 工程 | CI/CD 混乱，新人困惑 |
| 4 | 视频生成页/导出页纯 Mock 数据 | 🟡 功能 | 核心链路未跑通 |

---


## 三、分阶段路线图

### 阶段一：安全地基 + 依赖治理（预计 3-5 天）

> **目标**：解决所有 🔴 安全阻塞项，让项目具备可交付的安全底线。

#### 步骤 1.1：API Key 真加密

**涉及文件**：
- `apps/ai-video-api/src/modules/models/models.service.ts`
- `apps/ai-video-api/src/common/crypto/crypto.service.ts`（新建）
- `apps/ai-video-api/.env`

**细化任务**：
1. 在 `.env` 中新增 `API_KEY_ENCRYPTION_KEY`（32 字节 hex）
2. 新建 `CryptoService`：encrypt() / decrypt()，使用 AES-256-GCM
3. 修改 `createApiKey`：用 `cryptoService.encrypt()` 替换 Base64
4. 修改 `getDecryptedApiKey`：用 `cryptoService.decrypt()` 替换 Base64 解码
5. 写单元测试验证加解密往返

**验收标准**：数据库中存储 hex 密文（含 IV+AuthTag），无法直接解码出原始 Key。

#### 步骤 1.2：依赖归属修正

**涉及文件**：
- `apps/ai-video-api/package.json`
- `apps/ai-video-web/package.json`

**细化任务**：
1. 从 `ai-video-api` 移除所有前端依赖（@radix-ui/*、@tanstack/react-query、framer-motion、zustand、react-hook-form、socket.io-client 等）
2. 将这些依赖添加到 `ai-video-web/package.json`
3. 两个子项目分别 `pnpm install` 验证

**验收标准**：backend 只有后端依赖，frontend 有完整前端依赖列表。

#### 步骤 1.3：Auth 模块（JWT 鉴权）

**新建文件**：
- `modules/auth/auth.module.ts`
- `modules/auth/auth.controller.ts`
- `modules/auth/auth.service.ts`
- `modules/auth/dto/register.dto.ts`
- `modules/auth/dto/login.dto.ts`
- `modules/auth/strategies/jwt.strategy.ts`
- `modules/auth/guards/jwt-auth.guard.ts`
- `modules/auth/decorators/current-user.decorator.ts`

**细化任务**：
1. **AuthService**：register(email, password, name) → bcrypt 哈希 + 创建 User；login(email, password) → 验证 + 签发 JWT
2. **JwtStrategy**：从 JWT sub 提取 userId
3. **JwtAuthGuard**：全局或路由级使用
4. **@CurrentUser() 装饰器**：提取 userId
5. **Prisma Schema 修改**：User 表增加 `passwordHash` 字段
6. **替换所有硬编码**：每个 Controller 的 `const userId = 'temp-user-id'` → `@CurrentUser() userId: string`
7. 注册 AuthModule，配置全局 Guard

**验收标准**：
- `POST /auth/register` + `POST /auth/login` 返回 JWT
- 带 token 请求正常，无 token 返回 401
- 代码中不再出现 `'temp-user-id'`

---

### 阶段二：跑通核心创作链路（预计 5-7 天）

> **目标**：让"故事 → 分镜 → 预览图 → 视频"主链路真正可用。

#### 步骤 2.1：BullMQ 任务队列 + Worker

**新建文件**：
- `modules/queue/queue.module.ts`
- `modules/queue/queue.service.ts`
- `modules/queue/processors/video.processor.ts`
- `modules/queue/processors/image.processor.ts`

**细化任务**：
1. **QueueModule**：注册 BullMQ（ioredis），配置从 `ConfigService` 读取 `REDIS_URL`
2. **QueueService**：addVideoTask / addImageTask / getTaskStatus
3. **VideoProcessor**：消费任务 → 获取 API Key → 调用 VideoAdapter → 轮询状态 → 更新 GenerationTask + Shot
4. **ImageProcessor**：同理，将 `generatePreview` 从同步改为异步
5. 修改 `StoryboardController.generatePreview`：同步返回 → `queueService.addImageTask()` + 返回 taskId
6. 新增 `GET /projects/:projectId/tasks/:taskId` 端点

**验收标准**：
- 生成预览图不阻塞 HTTP，立即返回 taskId
- Redis 中有队列和 job 记录
- Worker 消费任务并更新数据库

#### 步骤 2.2：可灵视频 Adapter

**新建文件**：
- `modules/models/adapters/kling-video.adapter.ts`

**细化任务**：
1. 实现 `VideoAdapter` 接口：validateKey / generateVideo / getVideoTaskStatus
2. 在 `AdapterFactory` 注册：`this.register('kling-video', adapter, 'video')`
3. 在 seed 数据中添加可灵视频模型记录

**验收标准**：可通过 AdapterFactory 获取 VideoAdapter 并创建视频任务。

#### 步骤 2.3：视频生成页对接后端

**涉及文件**：
- `apps/ai-video-web/app/(workspace)/projects/[id]/generate/page.tsx`

**细化任务**：
1. 移除硬编码 `tasks` 数组
2. 用 `useQuery` 获取分镜列表
3. 每个分镜添加"生成视频"按钮 → 调用后端 API
4. 轮询任务状态（后续改 WebSocket）
5. 已完成分镜显示视频预览

**验收标准**：页面展示真实数据，生成按钮触发后端任务，状态实时更新。

---

### 阶段三：角色管理 + 创作助手（预计 5-7 天）

> **目标**：实现产品核心差异点——角色一致性管理和 AI 创作辅助。

#### 步骤 3.1：角色管理 API

**新建文件**：
- `modules/characters/characters.module.ts`
- `modules/characters/characters.controller.ts`
- `modules/characters/characters.service.ts`
- `modules/characters/dto/create-character.dto.ts`
- `modules/characters/dto/update-character.dto.ts`

**细化任务**：
1. `POST /projects/:projectId/characters` — 创建角色
2. `GET /projects/:projectId/characters` — 角色列表
3. `GET /projects/:projectId/characters/:id` — 角色详情
4. `PATCH /projects/:projectId/characters/:id` — 更新角色
5. `DELETE /projects/:projectId/characters/:id` — 删除角色
6. `POST .../characters/:id/generate-prompt` — LLM 生成角色提示词
7. `POST .../characters/:id/generate-image` — 图像模型生成主参考图

**验收标准**：完整 CRUD + AI 提示词生成 + AI 参考图生成。

#### 步骤 3.2：角色管理 UI

**新建文件**：
- `components/studio/CharacterTab.tsx`
- `components/studio/CharacterCard.tsx`
- `components/studio/CharacterForm.tsx`

**细化任务**：
1. Studio 新增"角色"tab
2. CharacterCard：头像、姓名、身份标签
3. CharacterForm：表单创建/编辑角色
4. "生成提示词"按钮 + "生成参考图"按钮
5. 角色列表支持删除

**验收标准**：在 Studio 中创建角色 → 自动生成提示词 → 生成参考图。

#### 步骤 3.3：分镜角色绑定

**涉及文件**：
- `storyboard.service.ts`（修改 generateShots）
- `components/studio/ShotDetailPanel.tsx`（新建）

**细化任务**：
1. 修改 `generateShots` 的 `buildUserPrompt`：注入角色 prompt 和外观描述
2. 分镜详情面板：增加"出场角色"多选下拉框
3. 选角色后，分镜提示词自动包含角色描述

**验收标准**：分镜关联角色，生成提示词含角色信息。

#### 步骤 3.4：创作助手 Chat 组件

**新建文件**：
- `components/assistant/AssistantPanel.tsx`
- `components/assistant/AssistantMessage.tsx`
- `modules/assistant/assistant.module.ts`
- `modules/assistant/assistant.controller.ts`
- `modules/assistant/assistant.service.ts`

**细化任务**：
1. 后端 `POST /assistant/chat`：根据 `context.page` 动态构建 system prompt
2. 前端 `AssistantPanel`：右下角可展开/折叠的 Chat 面板
3. 根据 Studio 的 activeTab 自动切换上下文

**验收标准**：在角色页问"帮我想一个忧郁的高中生"，AI 返回结构化角色描述。

---

### 阶段四：导出闭环 + 质量加固（预计 5-7 天）

> **目标**：补齐合成导出，让用户拿到成品 MP4。提升工程质量。

#### 步骤 4.1：FFmpeg 合成导出

**新建文件**：
- `modules/export/export.module.ts`
- `modules/export/export.controller.ts`
- `modules/export/export.service.ts`

**细化任务**：
1. `POST /projects/:projectId/export` — 触发导出（入队）
2. ExportService 核心逻辑：
   - 按 sequence 读取所有 Shot 的 resultUrl
   - 下载视频片段到临时目录
   - 调用 FFmpeg concat 拼接
   - 可选：烧录字幕（drawtext filter）
   - 上传到 MinIO/S3，返回下载 URL
3. 导出页对接后端 API

**验收标准**：点击导出 → 等待处理 → 获得可下载的 MP4。

#### 步骤 4.2：MinIO/StorageService

**新建文件**：
- `common/storage/storage.service.ts`

**细化任务**：
1. 封装 MinIO Client（`minio` 包已安装）
2. `uploadFile(bucket, key, buffer, contentType)` — 上传文件
3. `getPresignedUrl(bucket, key, expirySeconds)` — 生成预签名下载链接
4. 区分素材 bucket（用户上传）和产物 bucket（AI 生成）
5. 视频 Adapter 生成的视频存入产物 bucket

**验收标准**：视频文件写入 MinIO，前端通过预签名 URL 下载。

#### 步骤 4.3：TTS Adapter（豆包语音）

**新建文件**：
- `modules/models/adapters/doubao-tts.adapter.ts`

**细化任务**：
1. 实现 `TTSAdapter` 接口：validateKey / synthesize
2. 在 AdapterFactory 注册
3. 在 seed 数据中添加豆包语音模型

**验收标准**：可通过 AdapterFactory 获取 TTSAdapter 并生成音频文件。

#### 步骤 4.4：Studio 页面拆分 + 时间轴功能

**涉及文件**：
- `components/studio/StoryTab.tsx`（从 Studio 拆出）
- `components/studio/StoryboardTab.tsx`（从 Studio 拆出）
- `components/studio/ShotCard.tsx`（从 Studio 拆出）
- `components/studio/TimelineTab.tsx`（从 Studio 拆出，增加真实功能）

**细化任务**：
1. 将 Studio 页面 250+ 行拆分为独立组件
2. TimelineTab：展示分镜时长滑块、字幕/旁白编辑框、TTS 生成按钮
3. 时长调整后更新 Shot 的 duration 字段

**验收标准**：Studio 页面由多个独立组件组成，时间轴 tab 有真实编辑功能。

#### 步骤 4.5：单元测试补充

**涉及文件**：
- `modules/auth/auth.service.spec.ts`
- `modules/models/models.service.spec.ts`
- `modules/storyboard/storyboard.service.spec.ts`
- `common/crypto/crypto.service.spec.ts`

**细化任务**：
1. AuthService 测试：注册 + 登录 + 密码验证
2. ModelsService 测试：API Key 加密存储 + 解密读取
3. StoryboardService 测试：分镜生成 + JSON 解析
4. CryptoService 测试：加密往返 + 错误输入处理

**验收标准**：核心 Service 有单元测试覆盖，`pnpm test` 通过。

---

## 四、路线图总览

```
阶段一（安全地基）          阶段二（核心链路）          阶段三（产品差异）          阶段四（闭环+质量）
3-5 天                      5-7 天                      5-7 天                      5-7 天
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1.1 API Key 加密  │  ──▶  │ 2.1 BullMQ 队列   │  ──▶  │ 3.1 角色管理 API  │  ──▶  │ 4.1 FFmpeg 导出   │
│ 1.2 依赖归属修正   │       │ 2.2 可灵视频 Adapter│      │ 3.2 角色管理 UI    │       │ 4.2 MinIO 存储     │
│ 1.3 JWT 鉴权      │       │ 2.3 视频页对接     │       │ 3.3 分镜角色绑定   │       │ 4.3 TTS Adapter   │
└─────────────────┘       └─────────────────┘       │ 3.4 创作助手 Chat │       │ 4.4 Studio 拆分    │
                                                     └─────────────────┘       │ 4.5 单元测试      │
                                                                               └─────────────────┘
```

---

## 五、每个阶段完成后的验证清单

### 阶段一完成后
- [ ] 数据库中 API Key 字段为 hex 密文（非 Base64）
- [ ] `pnpm install` 在后端目录不报错
- [ ] `POST /auth/register` + `POST /auth/login` 返回 JWT
- [ ] 无 token 请求返回 401
- [ ] 代码搜索 `temp-user-id` 结果为 0

### 阶段二完成后
- [ ] 生成预览图不阻塞请求（立即返回 taskId）
- [ ] Redis 中有 job 记录
- [ ] 视频生成页显示真实分镜数据
- [ ] 点击"生成视频"能创建 GenerationTask

### 阶段三完成后
- [ ] Studio 中能创建/编辑/删除角色
- [ ] 角色能自动生成提示词和参考图
- [ ] 分镜能绑定角色，提示词含角色信息
- [ ] 创作助手能根据上下文返回有用建议

### 阶段四完成后
- [ ] 点击导出能获得可下载的 MP4
- [ ] 视频文件存储在 MinIO 产物 bucket
- [ ] TTS 能生成配音音频
- [ ] `pnpm test` 核心 Service 测试通过
- [ ] Studio 页面由多个独立组件组成

---

*路线图版本：V1.0*
*制定者：Codex*
*日期：2026-06-30*
