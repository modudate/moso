"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const IS_DEV = process.env.NODE_ENV === "development";
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

  const handleGoogleLogin = async () => {
    if (loading) return;
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

      <div className="flex-1 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="MOSO 모두의 소개팅"
          width={280}
          height={280}
          priority
        />
      </div>

      <div className="w-full px-6 pb-12 flex flex-col items-center gap-3">
        {IS_DEV && (
          <>
            <div className="flex gap-3 w-full max-w-sm">
              <Link href="/female" className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-semibold text-center shadow-md hover:bg-pink-600 transition-colors">여성</Link>
              <Link href="/male" className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold text-center shadow-md hover:bg-blue-600 transition-colors">남성</Link>
              <Link href="/admin" className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-semibold text-center shadow-md hover:bg-gray-800 transition-colors">관리자</Link>
            </div>
            <Link href="/register" className="w-full max-w-sm py-3 bg-white/20 text-white rounded-xl font-semibold text-center border border-white/40 hover:bg-white/30 transition-colors">회원가입</Link>
          </>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full max-w-sm px-6 py-4 bg-white rounded-2xl font-semibold text-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:pointer-events-none"
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

        <p className="w-full max-w-sm text-[11px] leading-5 text-white/90 text-center mt-2">
          ‘Google 계정으로 계속하기’를 누르면 모두의 모임{" "}
          <Link href="/terms" className="underline font-medium">이용약관</Link>
          에 동의하는 것으로 간주됩니다. 회원의 개인정보 처리 방식은{" "}
          <Link href="/privacy" className="underline font-medium">개인정보처리방침</Link>
          에서 확인해 주세요.
        </p>
      </div>
    </main>
  );
}
