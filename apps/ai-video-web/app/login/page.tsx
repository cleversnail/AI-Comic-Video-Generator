"use client";

import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await authApi.register({ email, password, name: name || undefined });
      } else {
        await authApi.login({ email, password });
      }
      router.push("/projects");
    } catch (err: any) {
      setError(err.response?.data?.message || "操作失败，请重试");
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
