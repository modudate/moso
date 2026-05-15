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

  // 인앱 브라우저 안내 카피 — 잘리지 않게 짧고 부드럽게
  const title =
    kind === "kakaotalk"
      ? "카카오 브라우저는 지원하지 않아요"
      : kind === "facebook" || kind === "instagram" || kind === "line" || kind === "naver"
      ? "이 브라우저는 지원하지 않아요"
      : "안전한 로그인을 위해 안내드려요";
  const subtitle = "다른 브라우저로 열어주세요";

  return (
    <>
      {/* 하단 스티키 알림 바 — 텍스트 / 버튼을 세로 분리해서 잘림 0% */}
      <div
        className="fixed bottom-0 inset-x-0 z-[200] flex justify-center px-3 pointer-events-none"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.875rem)" }}
      >
        <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.18)] border border-orange-100 overflow-hidden pointer-events-auto animate-slideUpBanner">
          {/* 1행: 아이콘 + 텍스트 + 닫기 */}
          <div className="px-4 pt-3.5 pb-2 flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center mt-0.5">
              <svg className="w-5 h-5 text-[#ff8a3d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-gray-900 leading-snug">{title}</p>
              <p className="text-[12.5px] text-gray-500 mt-1 leading-snug">{subtitle}</p>
            </div>
            <button
              onClick={close}
              className="flex-shrink-0 -mt-1 -mr-1 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors"
              aria-label="닫기"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 2행: 풀-너비 액션 버튼 */}
          <div className="px-4 pb-3.5">
            <button
              onClick={onOpenExternal}
              className="w-full py-3 rounded-xl text-white text-[14px] font-bold shadow-sm transition-transform active:scale-[0.98] hover:shadow-md"
              style={{ backgroundColor: "#ff8a3d" }}
            >
              다른 브라우저로 열기 →
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideUpBanner {
            from {
              transform: translateY(140%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .animate-slideUpBanner {
            animation: slideUpBanner 0.45s cubic-bezier(0.16, 1, 0.3, 1);
          }
        `}</style>
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
