 # AI 漫剧创作台 — 代码审查报告
 
 > 审查日期：2026-06-30
 > 审查范围：apps/ai-video-api（NestJS）、apps/ai-video-web（Next.js 14）
 > 审查基准：产品方案 V2.0、需求文档分析建议
 > 原始开发工具：Claude Code
 
 ---
 
 ## 一、总体评价
 
 Claude Code 产出了一个骨架清晰、方向正确的初版代码。项目结构、技术选型、Prisma Schema 领域模型和 Adapter 架构模式都合理，说明对需求文档理解到位。但代码处于"演示级原型"阶段——能跑、能展示交互形态，距离可交付 MVP 有明显差距。
 
 **一句话：方向对，骨架好，但肌肉没长全。**
 
 ---
 
 ## 二、Claude Code 开发思路复盘
 
 ### 做得好的
 
 - **领域建模扎实**：Prisma Schema 覆盖 User→Project→Character→Storyboard→Shot→GenerationTask→AIModel→UserApiKey 全链路，表结构符合需求文档
 - **Adapter 架构方向正确**：LLMAdapter/ImageAdapter/VideoAdapter/TTSAdapter 按能力拆分，与需求 V2.0 建议吻合
 - **前端页面骨架到位**：首页、项目列表、Studio 工作台、模型中心、生成页、导出页都有对应页面
 - **种子数据完善**：预置了 DeepSeek、FLUX、可灵等模型元数据
 - **纵向切片策略合理**：先打通"创建项目→输入故事→AI 分镜→预览图"核心链路
 
 ### 策略问题
 
 打通核心链路后，没有回头补横向基础设施（认证、错误处理、测试），也没有把链路"做实"（分镜生成绕过 Adapter、视频生成页纯 mock）。
 
 ---
 
 ## 三、代码质量问题
 
 ### 🔴 严重问题
 
 #### 1. API Key 加密形同虚设
 
 `models.service.ts:78`：`Buffer.from(dto.apiKey).toString('base64')`
 
 Base64 是编码不是加密。代码注释写"生产环境应使用 AES-256-GCM"，但这是安全漏洞不能延后。
 
 **修复**：使用 `crypto.createCipheriv('aes-256-gcm', key, iv)` 配合环境变量管理密钥。
 
 #### 2. 硬编码临时用户 ID
 
 所有 Controller/Service 使用 `const userId = 'temp-user-id'`。没有 JWT 鉴权、用户隔离。
 
 **修复**：实现 JWT Guard + Passport 策略。`@nestjs/jwt` 和 `passport-jwt` 已安装，只需补 AuthModule。
 
 #### 3. 分镜生成绕过 Adapter 体系
 
 `storyboard.service.ts:85-120`：用裸 axios 硬编码 DeepSeek API，完全不用已注册的 DeepSeekAdapter。
 
 **修复**：改用 `this.adapterFactory.getLLMAdapter(modelId).generateText(...)`。
 
 ### 🟡 中等问题
 
 #### 4. 依赖管理混乱
 
 `apps/ai-video-api/package.json` 包含大量前端依赖：@radix-ui/*, @tanstack/react-query, framer-motion, zustand, react-hook-form, socket.io-client 等。同时 `apps/ai-video-web/package.json` 几乎为空。
 
 **修复**：将前端依赖移回 `apps/ai-video-web/package.json`，从后端删除。
 
 #### 5. 重复的 ensureUserExists
 
 `models.service.ts` 和 `projects.service.ts` 各自复制了相同的临时用户创建逻辑。
 
 **修复**：抽取到 UserService 或等待 Auth 模块就位后移除。
 
 #### 6. AdapterFactory 类型安全不足
 
 `getAdapter<T>()` 用 `as T` 强制转换，无运行时 capability 校验。如果传错 capability 类型不会报错。
 
 **修复**：给 BaseAdapter 加 `capability` 字段，register 和 getAdapter 时校验。
 
 #### 7. Studio 页面 250+ 行巨型组件
 
 `projects/[id]/studio/page.tsx` 混合了 header、tab 导航、故事编辑、分镜网格、详情面板、时间轴、内联图标组件。
 
 **修复**：拆分为 StudioHeader / StoryTab / StoryboardTab / ShotCard / ShotDetailPanel / TimelineTab。
 
 #### 8. 视频生成页和导出页纯 Mock
 
 `generate/page.tsx` 和 `export/page.tsx` 使用硬编码数组，无 API 调用。
 
 **修复**：对接后端 GenerationTask API 和 useQuery。
 
 #### 9. 缺少全局异常处理
 
 无 ExceptionFilter，Prisma 错误直接暴露给客户端。
 
 **修复**：添加 GlobalExceptionFilter 统一处理 PrismaError / HttpException / 未知错误。
 
 ### 🟢 轻微问题
 
 - TypeScript 类型全部内联在 `lib/api.ts`，建议拆分 `types/*.ts`
 - Tailwind 自定义颜色（anime-purple 等）需确认 CSS 变量完整定义
 - 测试几乎为零（仅脚手架生成的 app.controller.spec.ts）
 - VideoAdapter / TTSAdapter 有接口无实现
 - BullMQ / Redis / MinIO 已安装但零使用
 
 ---
 
 ## 四、需求覆盖度（P0 功能）
 
 | 功能 | 状态 |
 |------|------|
 | 项目管理 CRUD | ✅ 完整 |
 | 项目自动保存 | ❌ 缺失 |
 | 角色创建 + 主参考图 | ⚠️ 表已建，无 API/UI |
 | 故事输入 | ⚠️ 有输入框但仅用于分镜生成 |
 | AI 分镜生成 | ⚠️ 后端能调但绕过 Adapter |
 | 分镜 + 镜头参数编辑 | ⚠️ UI 骨架，数据未持久化 |
 | 分镜静态预览 | ⚠️ 后端 API 有，前端按钮有 |
 | 字幕/旁白/时长 | ❌ 缺失 |
 | 视频生成队列 | ❌ 缺失（表存在无 Worker） |
 | 单镜重生成 | ❌ 缺失 |
 | 合成导出 MP4 | ❌ 缺失 |
 | 模型列表/详情/Key 配置 | ✅ 最完整模块 |
 | Key 加密存储 | ❌ Base64 非加密 |
 | 项目级模型配置 | ⚠️ API 有，前端未对接 |
 
 **P0 覆盖率：约 35% 可用，40% 有骨架，25% 缺失。**
 
 ---
 
 ## 五、架构层面建议
 
 ### 1. 引入 BullMQ 队列系统
 
 BullMQ + ioredis 已安装未使用。视频/图片/TTS 生成为长耗时任务，不应同步等待。
 
 建议流程：HTTP → 创建 GenerationTask → 入队 → Worker 消费 → Adapter 调用 → 更新状态 → WebSocket/SSE 推送进度。
 
 ### 2. 素材与产物链路分离
 
 需求 V2.0 明确要求：
 - 素材（用户上传）：前端直传 MinIO/S3
 - 产物（AI 生成）：后端 Worker 写入 MinIO/S3
 
 @aws-sdk/client-s3 和 minio 已安装未使用，需实现 StorageService。
 
 ### 3. 补充 Auth 模块（最高优先级）
 
 建议结构：
 ```
 AuthModule
 ├── auth.controller.ts   — POST /auth/login, /auth/register
 ├── auth.service.ts      — JWT 签发、密码哈希
 ├── jwt.strategy.ts      — Passport JWT 策略
 ├── jwt-auth.guard.ts    — 全局 Guard
 └── current-user.decorator.ts
 ```
 
 替换所有 `const userId = 'temp-user-id'` 为 `@CurrentUser()`。
 
 ### 4. 前端状态管理
 
 zustand 已安装未使用。建议用于：项目编辑状态、分镜选择状态、WebSocket 连接管理。
 
 ---
 
 ## 六、需求层面建议
 
 ### 6.1 极速模式优先
 
 产品方案的核心差异点是"3 分钟出片"的极速模式。当前实现偏向专业模式的 Studio 工作台，极速模式入口是空的 Button。
 
 **建议**：优先实现极速模式完整流程：
 1. 角色选择（模板/快速创建）
 2. 故事输入
 3. 一键生成粗剪（串联分镜 + 预览 + 视频）
 4. 预览与精修
 
 ### 6.2 角色一致性是护城河
 
 Prisma 有 Character 表但无任何 API/UI。角色一致性是这个产品最核心的差异化能力，应优先于视频生成。
 
 **建议**：先做角色管理 → 角色提示词生成 → 角色绑定到分镜，再做视频生成。
 
 ### 6.3 创作助手（AI Assistant）
 
 需求文档提出的"统一创作助手"概念完全没有代码体现。建议先做一个简单的侧边栏 Chat 组件，按当前页面上下文提供辅助。
 
 ---
 
 ## 七、优先级路线图建议
 
 ### 阶段一：补安全债 + 做"可用"（1-2 周）
 
 1. Auth 模块（JWT 鉴权）
 2. API Key AES 加密
 3. 分镜生成改用 Adapter
 4. 全局异常处理
 5. 依赖归属修正
 
 ### 阶段二：跑通核心链路（2-3 周）
 
 6. BullMQ 队列 + Worker
 7. VideoAdapter 实现（可灵）
 8. 视频生成页对接 API
 9. 角色管理 API + UI
 10. StorageService（MinIO）
 
 ### 阶段三：产品化（3-4 周）
 
 11. 极速模式完整流程
 12. TTS Adapter + 配音
 13. FFmpeg 合成导出
 14. 创作助手 Chat 组件
 15. 单元测试 + E2E
 
 ---
 
 *审查版本：V1.0*
 *审查者：Codex*
 *日期：2026-06-30*
