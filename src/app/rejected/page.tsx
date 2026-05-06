"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RejectedPage() {
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/me", { cache: "no-store" });
        const { user } = await meRes.json();
        if (!user?.id) return;
        // 사유는 users 테이블의 rejection_reason 컬럼. /api/profiles?id= 로 조회 가능.
        const res = await fetch(`/api/profiles?id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const r: string | null = data?.user?.rejectionReason ?? null;
        if (r) setReason(r);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10" style={{ backgroundColor: "#ff8a3d" }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 text-center space-y-5 max-w-md w-full">
        <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">가입이 반려되었습니다</h2>
        {reason ? (
          <div className="text-left bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">반려 사유</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{reason}</p>
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
              안내사항을 참고하여 보완 후 다시 신청해주세요. 추가 문의는 카카오톡 채널로 연락주세요.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed">
            관리자 검토 결과 가입이 반려되었습니다.<br />
            자세한 내용은 카카오톡 채널로 문의해주세요.
          </p>
        )}
        <button onClick={() => router.push("/")}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-md"
          style={{ backgroundColor: "#ff8a3d" }}>
          홈으로
        </button>
      </div>
    </main>
  );
}
