"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import InAppBrowserNotice from "@/components/InAppBrowserNotice";
import { detectInAppBrowser, isAndroid, openInExternalAndroid, openInExternalKakao } from "@/lib/in-app-browser";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function dec2hex(n: number) {
  return ("0" + n.toString(16)).slice(-2);
}

function generateVerifier(): string {
  const arr = new Uint32Array(56);
  crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join("");
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlAscii(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [showInAppHelp, setShowInAppHelp] = useState(false);

  // Google 로그인 → 뒤로가기/취소로 돌아올 때 bfcache 로 복원되면 loading 이 true 인 채로 남아
  // "로그인 중..." 오버레이가 계속 떠 있는 버그를 방지
  useEffect(() => {
    const reset = () => setLoading(false);
    window.addEventListener("pageshow", reset);
    window.addEventListener("focus", reset);
    const onVis = () => { if (document.visibilityState === "visible") reset(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("focus", reset);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const handleGoogleLogin = async () => {
    if (loading) return;

    // 인앱 브라우저(카카오톡/페북/인스타/라인 등) 가드
    //   Google OAuth 가 disallowed_useragent 로 막히기 때문에 진입 자체를 차단.
    //   - Android: Chrome 강제 실행 시도
    //   - iOS    : 안내 모달 (Safari 로 직접 열기 가이드)
    const inApp = detectInAppBrowser();
    if (inApp) {
      if (isAndroid()) {
        if (inApp === "kakaotalk") {
          openInExternalKakao();
          setTimeout(() => openInExternalAndroid(), 800);
        } else {
          openInExternalAndroid();
        }
        return;
      }
      // iOS / 기타
      setShowInAppHelp(true);
      return;
    }

    setLoading(true);
    try {
      const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
      const verifier = generateVerifier();
      const challenge = await generateChallenge(verifier);

      const cookieName = `sb-${ref}-auth-token-code-verifier`;
      const cookieValue = `base64-${base64UrlAscii(verifier)}`;
      const isLocal = window.location.hostname === "localhost";
      document.cookie = `${cookieName}=${cookieValue}; path=/; max-age=600; SameSite=Lax${isLocal ? "" : "; Secure"}`;

      const redirectTo = encodeURIComponent(
        `${window.location.origin}/auth/callback`,
      );
      window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}&code_challenge=${challenge}&code_challenge_method=s256`;
    } catch {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#ff8a3d" }}>
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-8 h-8 border-3 border-[#ff8a3d] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-700">로그인 중...</p>
          </div>
        </div>
      )}

      <div className="flex-1 w-full flex flex-col items-center justify-center gap-20 px-6">
        <Image
          src="/logo.png"
          alt="MOSO 모두의 소개팅"
          width={1000}
          height={1230}
          priority
          className="w-40 sm:w-44 h-auto"
        />

        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white rounded-2xl font-semibold text-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#ff8a3d] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            {loading ? "로그인 중..." : "Google 계정으로 계속하기"}
          </button>

          <p className="text-[11px] leading-5 text-white/90 text-center mt-1">
            ‘Google 계정으로 계속하기’를 누르면 모두의 모임{" "}
            <Link href="/terms" className="underline font-medium">이용약관</Link>
            에 동의하는 것으로 간주됩니다. 회원의 개인정보 처리 방식은{" "}
            <Link href="/privacy" className="underline font-medium">개인정보처리방침</Link>
            에서 확인해 주세요.
          </p>
        </div>
      </div>

      {/* 인앱 브라우저 진입 시 하단 알림 바 (자동 노출, 닫기 가능) */}
      <InAppBrowserNotice />

      {/* iOS 인앱 → Google 로그인 시도 차단 모달 */}
      {showInAppHelp && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Safari 에서 열어주세요</h3>
              <button onClick={() => setShowInAppHelp(false)} className="text-gray-400 hover:text-gray-700" aria-label="닫기">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              Google 로그인은 보안 정책상 카카오톡 등 인앱 브라우저에서 차단됩니다.<br />
              아래 방법으로 Safari 에서 다시 열어주세요.
            </p>
            <ol className="text-[13px] text-gray-700 space-y-2 pl-1">
              <li>1. 화면 오른쪽 상단의 <b>···</b> (또는 공유) 버튼 누르기</li>
              <li>2. <b>Safari로 열기</b> 선택</li>
            </ol>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 flex items-center gap-2">
              <span className="text-[11px] text-gray-400 truncate flex-1">
                {typeof window !== "undefined" ? window.location.href : ""}
              </span>
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(window.location.href); } catch {}
                }}
                className="flex-shrink-0 px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-white border border-gray-300 hover:border-[#ff8a3d] text-gray-700"
              >
                URL 복사
              </button>
            </div>
            <button
              onClick={() => setShowInAppHelp(false)}
              className="w-full py-3 rounded-xl text-white font-bold"
              style={{ backgroundColor: "#ff8a3d" }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
