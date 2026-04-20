"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  className?: string;
};

export default function LogoutButton({ className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    // 피드백용 미리보기 쿠키도 함께 초기화
    document.cookie = "preview_bypass=; path=/; max-age=0; SameSite=Lax";
    router.replace("/");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={
        className ??
        "text-xs text-white/80 hover:text-white disabled:opacity-60"
      }
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
