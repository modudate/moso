"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  gender: "male" | "female";
};

const SHARE_URL_FALLBACK = "https://ourmo.kr";

export default function Sidebar({ open, onClose, gender }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const handleShare = async () => {
    const url =
      typeof window !== "undefined" ? window.location.origin : SHARE_URL_FALLBACK;
    const shareData = {
      title: "모두의 소개팅",
      text: "모두의 소개팅에서 좋은 인연을 만나보세요!",
      url,
    };
    try {
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.share) {
        await nav.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert("링크가 복사되었습니다!");
      }
    } catch {
      // user cancelled or share failed silently
    }
    onClose();
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    document.cookie = "preview_bypass=; path=/; max-age=0; SameSite=Lax";
    router.replace("/");
    router.refresh();
  };

  const profileHref = gender === "female" ? "/female/me" : "/male/me";

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 right-0 h-full w-[320px] max-w-[85vw] bg-white z-[101] shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
      >
        <div className="h-full flex flex-col">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ backgroundColor: "#ff8a3d" }}
          >
            <h2 className="text-white font-bold text-lg tracking-tight">메뉴</h2>
            <button
              onClick={onClose}
              className="text-white/90 hover:text-white p-1 -mr-1"
              aria-label="닫기"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            <MenuItem
              icon={
                <IC d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              }
              label="이용가이드"
              hint="(링크 전달 필요)"
              disabled
            />

            {gender === "female" && (
              <MenuItem
                icon={
                  <IC d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                }
                label="매칭요청 결과"
                hint="(작업중)"
                disabled
              />
            )}

            <MenuItem
              icon={
                <IC d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              }
              label="내 프로필 미리보기"
              href={profileHref}
              onNavigate={onClose}
            />

            <MenuItem
              icon={
                <IC d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              }
              label="내 프로필 수정요청"
              externalHref="https://2o017.channel.io/"
              onNavigate={onClose}
            />

            <MenuItem
              icon={
                <IC d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              }
              label="친구 초대"
              onClick={handleShare}
            />

            <MenuItem
              icon={
                <IC d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              }
              label="오프라인 모임 신청"
              hint="(링크 전달 필요)"
              disabled
            />

            <MenuItem
              icon={
                <IC d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              }
              label="카카오톡 채널 문의"
              hint="(링크 전달 필요)"
              disabled
            />

            <div className="border-t border-border my-2" />

            <MenuItem
              icon={
                <IC d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              }
              label={loggingOut ? "로그아웃 중..." : "로그아웃"}
              onClick={handleLogout}
              danger
            />
          </nav>

          <div className="px-5 py-3 text-[11px] text-muted-fg/70 border-t border-border">
            모두의 소개팅 · MOSO
          </div>
        </div>
      </aside>
    </>
  );
}

function IC({ d }: { d: string }) {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  href?: string;
  externalHref?: string;
  onClick?: () => void;
  onNavigate?: () => void;
  danger?: boolean;
};

function MenuItem({
  icon,
  label,
  hint,
  disabled,
  href,
  externalHref,
  onClick,
  onNavigate,
  danger,
}: MenuItemProps) {
  const base =
    "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors";
  const active = danger
    ? "text-danger hover:bg-danger/5"
    : "text-foreground hover:bg-muted/40";
  const disabledCls = "text-muted-fg/60 cursor-not-allowed";

  const chevron = (
    <svg
      className="w-4 h-4 text-muted-fg/40 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );

  const inner = (
    <>
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      {hint && (
        <span className="text-[11px] text-muted-fg/70 flex-shrink-0">
          {hint}
        </span>
      )}
      {!disabled && !danger && chevron}
    </>
  );

  if (disabled) {
    return <div className={`${base} ${disabledCls}`}>{inner}</div>;
  }

  if (externalHref) {
    return (
      <a
        href={externalHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={`${base} ${active}`}
      >
        {inner}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} onClick={onNavigate} className={`${base} ${active}`}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${active}`}>
      {inner}
    </button>
  );
}
