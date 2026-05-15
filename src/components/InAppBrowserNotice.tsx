"use client";

import { useEffect, useState } from "react";
import {
  detectInAppBrowser,
  isAndroid,
  isIOS,
  openInExternalAndroid,
  openInExternalKakao,
  type InAppKind,
} from "@/lib/in-app-browser";

const DISMISS_KEY = "moso_inapp_banner_dismissed";

// 카카오톡 등 인앱 브라우저로 들어온 사용자에게 "외부 브라우저로 열어주세요" 안내를 띄움.
//   · Android  → Chrome 자동 실행 시도 (intent:// 또는 kakaotalk://web/openExternal)
//   · iOS      → 외부 브라우저 강제 불가. 모달로 "··· 메뉴 → Safari 로 열기" 안내 + URL 복사
export default function InAppBrowserNotice() {
  const [mounted, setMounted] = useState(false);
  const [kind, setKind] = useState<InAppKind>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  // 클라이언트 mount 후에만 navigator/sessionStorage 접근 (SSR hydration 안전)
  useEffect(() => {
    if (mounted) return;
    setMounted(true);
    setKind(detectInAppBrowser());
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, [mounted]);

  if (!mounted || !kind || dismissed) return null;

  const onOpenExternal = () => {
    if (typeof window === "undefined") return;
    if (isAndroid()) {
      // 카카오톡인 경우 카카오 전용 스킴 우선 시도, 1초 뒤 intent fallback
      if (kind === "kakaotalk") {
        openInExternalKakao();
        setTimeout(() => openInExternalAndroid(), 800);
        return;
      }
      openInExternalAndroid();
      return;
    }
    if (isIOS()) {
      // iOS 는 자동 외부 열기 불가 → 안내 모달
      setShowHelp(true);
      return;
    }
    setShowHelp(true);
  };

  const onCopy = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <>
      {/* 하단 스티키 알림 바 */}
      <div
        className="fixed bottom-0 inset-x-0 z-[200] mx-auto w-full max-w-[480px]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        <div className="mx-3 mb-2 rounded-2xl bg-white/95 backdrop-blur shadow-2xl border border-orange-200 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 flex-shrink-0 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#ff8a3d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0 3.008h.008v.008H12v-.008zM9.401 3.003c.526-.91 1.832-.91 2.358 0l9.262 16.027c.526.91-.131 2.07-1.179 2.07H1.318c-1.048 0-1.705-1.16-1.179-2.07L9.401 3.003z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 leading-tight">안전한 로그인을 위해</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                Chrome / Safari 에서 열어주세요
              </p>
            </div>
            <button
              onClick={onOpenExternal}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-white text-[12px] font-bold shadow-sm hover:opacity-90"
              style={{ backgroundColor: "#ff8a3d" }}
            >
              열기 →
            </button>
            <button
              onClick={close}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700"
              aria-label="닫기"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* iOS 안내 모달 (외부 브라우저 자동 열기 불가) */}
      {showHelp && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Safari 로 열기</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-700" aria-label="닫기">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              Google 로그인은 인앱 브라우저에서 차단됩니다.<br />
              아래 방법으로 Safari 에서 열어주세요.
            </p>
            <ol className="text-[13px] text-gray-700 space-y-2 pl-1">
              <li>1. 화면 오른쪽 상단의 <b>···</b> (또는 공유) 버튼 누르기</li>
              <li>
                2. <b>Safari로 열기</b> 선택
              </li>
            </ol>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 flex items-center gap-2">
              <span className="text-[11px] text-gray-400 truncate flex-1">
                {typeof window !== "undefined" ? window.location.href : ""}
              </span>
              <button
                onClick={onCopy}
                className="flex-shrink-0 px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-white border border-gray-300 hover:border-[#ff8a3d] text-gray-700"
              >
                {copied ? "복사됨" : "URL 복사"}
              </button>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-3 rounded-xl text-white font-bold"
              style={{ backgroundColor: "#ff8a3d" }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// 외부 컴포넌트(예: 랜딩의 Google 로그인 버튼)에서 사용할 수 있는 가드 헬퍼
//   인앱 브라우저면 외부 브라우저 열기 시도 후 true 반환 (호출 측은 OAuth 진행 중단)
export function tryEscapeIfInApp(): boolean {
  if (typeof window === "undefined") return false;
  const kind = detectInAppBrowser();
  if (!kind) return false;
  if (isAndroid()) {
    if (kind === "kakaotalk") {
      openInExternalKakao();
      setTimeout(() => openInExternalAndroid(), 800);
      return true;
    }
    openInExternalAndroid();
    return true;
  }
  return true; // iOS 등은 호출 측이 안내 모달을 띄우도록 true 반환만
}
