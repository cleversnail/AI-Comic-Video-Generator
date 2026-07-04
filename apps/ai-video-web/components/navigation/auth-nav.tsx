"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function AuthNav() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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

  const handleLogout = () => {
    authApi.logout();
    setLoggedIn(false);
    router.push('/');
  };

  if (!loggedIn) {
    return (
      <Link href="/login">
        <button className="h-8 px-4 text-sm rounded-lg bg-anime-purple text-white hover:bg-[#8B6FFF] transition-all">
          登录
        </button>
      </Link>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">{name}</span>
        <button
          onClick={() => setShowLogoutDialog(true)}
          className="text-xs text-text-disabled hover:text-warm-orange transition-colors"
        >
          退出
        </button>
      </div>

      <ConfirmDialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogout}
        title="退出登录"
        description={`当前账号：${name}，确定要退出吗？`}
        confirmText="退出登录"
        cancelText="再想想"
        variant="danger"
      />
    </>
  );
}
