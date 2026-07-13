# 安全策略

## 📢 报告漏洞

如果你发现了本项目的安全漏洞，**请不要在公开 Issue 中披露**，以免在修复前被恶意利用。

请通过以下任一渠道私下告知维护者：

- 通过 GitHub 的 [Private vulnerability reporting](https://docs.github.com/zh/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) 功能提交
- 或者向仓库所有者发送私信 / 邮件（请见 GitHub 主页联系方式）

报告中请尽量包含：

- 影响的模块 / 端点 / 文件路径
- 复现步骤或最小复现样例
- 你评估的影响范围（信息泄露 / 越权 / RCE / DoS 等）
- 可能的修复思路（可选）

我们会在收到报告后：

1. **48 小时内**回复确认
2. **7 天内**给出评估结论与初步修复计划
3. 修复发布后在 [SECURITY.md](SECURITY.md) 或 Release Notes 中致谢报告者（如你希望）

## 🛡️ 支持的版本

项目仍处于早期开发阶段，只对 `main` 分支的最新提交提供安全支持。历史 tag 不再回补。

| 版本 | 是否支持 |
|------|:-------:|
| `main`（最新） | ✅ |
| 其它历史提交 | ❌ |

## 🔒 已知的安全实践

本项目已经采取的安全措施（详见根 README 与代码）：

- **JWT 鉴权**：基于 Passport.js 的 JWT 策略
- **API Key 加密**：用户配置的第三方 API Key 使用 AES-256-GCM 加密存储
- **图形验证码**：注册接口强制校验，防止批量注册
- **频率限制**：注册 / 登录 / 全局默认限流
- **全局异常过滤**：统一捕获 Prisma / HTTP / 未知错误，不暴露内部细节

如果你在使用过程中发现上述任何一项被绕过或存在缺陷，请按上文流程私下报告。感谢！