"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export function AuthNav() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const check = () => {
      const hasToken = authApi.isLoggedIn();
      setLoggedIn(hasToken);
      if (hasToken) {
        try {
          const payload = JSON.parse(atob(localStorage.getItem('accessToken')!.split('.')[1]));
          setName(payload.email?.split('@')[0] || '用户');
        } catch { setName('用户'); }
      }
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  if (!loggedIn) {
    return (
      <Link href="/login">
        <button className="h-8 px-4 text-sm rounded-lg bg-anime-purple text-white hover:bg-[#8B6FFF] transition-all">
          登录
        </button>
      </Link>
    );
  }

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      authApi.logout();
      setLoggedIn(false);
      router.push('/');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-secondary">{name}</span>
      <button
        onClick={handleLogout}
        className="text-xs text-text-disabled hover:text-warm-orange transition-colors"
      >
        退出
      </button>
    </div>
  );
}
