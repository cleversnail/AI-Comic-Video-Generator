 # AI-video 项目指令
 
 ## Git 工作流
 
 每次完成一个功能模块或逻辑单元后，自动执行 git 提交：
 
 1. 运行 `git add -A`
 2. 运行 `git commit -m "feat: <模块名>: <改动摘要>"`
 
 什么是"功能模块"：一个独立完整的改动，比如：
 - 一个新的 API 端点及其 Service
 - 一个新的页面及其组件
 - 一个新的数据库模型或 Prisma migration
 - 一个完整的 UI 功能
 - 一次有意义的重构
 
 原则：不要每改一个文件就 commit，也不要让多个不相关的功能堆在一个 commit 里。如果这个改动可以单独回退而不影响其他功能，它就值得单独 commit。
 如果有嵌套的子模块 git 目录（如 `apps/ai-video-api/.git`），请先删除它们，统一使用根目录的 git 仓库。
