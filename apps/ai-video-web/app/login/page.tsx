"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Captcha state
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaText, setCaptchaText] = useState("");

  const fetchCaptcha = useCallback(async () => {
    try {
      const data = await authApi.getCaptcha();
      setCaptchaId(data.id);
      setCaptchaSvg(data.svg);
      setCaptchaText("");
    } catch {
      setError("获取验证码失败，请刷新重试");
    }
  }, []);

  // Fetch captcha when switching to register mode
  useEffect(() => {
    if (isRegister) {
      fetchCaptcha();
    }
  }, [isRegister, fetchCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!captchaId || !captchaText.trim()) {
          setError("请输入验证码");
          setLoading(false);
          return;
        }
        await authApi.register({
          email,
          password,
          name: name || undefined,
          captchaId,
          captchaText: captchaText.trim(),
        });
      } else {
        await authApi.login({ email, password });
      }
      router.push("/projects");
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || "操作失败，请重试");
      // Refresh captcha on error for register
      if (isRegister) fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cinema flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
            AI 漫剧创作台
          </h1>
          <p className="text-text-secondary">
            {isRegister ? "创建账号开始创作" : "登录以继续创作"}
          </p>
        </div>

        <div className="bg-panel-deep border border-divider rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  昵称（可选）
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的昵称"
                  className="w-full h-11 rounded-lg border border-divider bg-panel-mid px-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-anime-purple focus:ring-1 focus:ring-anime-purple/30"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full h-11 rounded-lg border border-divider bg-panel-mid px-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-anime-purple focus:ring-1 focus:ring-anime-purple/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                required
                minLength={6}
                className="w-full h-11 rounded-lg border border-divider bg-panel-mid px-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-anime-purple focus:ring-1 focus:ring-anime-purple/30"
              />
            </div>

            {/* Captcha - only show in register mode */}
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  验证码
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={captchaText}
                    onChange={(e) => setCaptchaText(e.target.value)}
                    placeholder="输入验证码"
                    required
                    maxLength={6}
                    className="flex-1 h-11 rounded-lg border border-divider bg-panel-mid px-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-anime-purple focus:ring-1 focus:ring-anime-purple/30"
                  />
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    className="h-11 px-3 rounded-lg border border-divider bg-panel-mid hover:border-anime-purple/40 transition-colors flex items-center flex-shrink-0"
                    title="刷新验证码"
                  >
                    {captchaSvg ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: captchaSvg }}
                        className="w-[100px] h-[36px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      />
                    ) : (
                      <span className="text-xs text-text-disabled px-2">加载中...</span>
                    )}
                  </button>
                </div>
                <p className="text-xs text-text-disabled mt-1.5">
                  点击图片可刷新验证码
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-warm-orange/10 border border-warm-orange/30 text-warm-orange text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-anime-purple text-white font-medium hover:bg-[#8B6FFF] transition-all disabled:opacity-50"
            >
              {loading ? "处理中..." : isRegister ? "注册" : "登录"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-sm text-text-secondary hover:text-anime-purple transition-colors"
            >
              {isRegister ? "已有账号？去登录" : "没有账号？去注册"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-text-disabled mt-6">
          <a href="/" className="hover:text-text-secondary transition-colors">← 返回首页</a>
        </p>
      </div>
    </div>
  );
}
