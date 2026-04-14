"use client";

import { useRouter } from "next/navigation";

export default function RegisterCompletePage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "#ff8a3d" }}>
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center space-y-5 max-w-sm w-full">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">가입 신청 완료!</h2>
        <p className="text-gray-500 leading-relaxed">
          관리자 승인 후 서비스를 이용하실 수 있습니다.<br />
          승인까지 잠시만 기다려주세요.
        </p>
        <button onClick={() => router.push("/")}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-md hover:shadow-lg transition-all"
          style={{ backgroundColor: "#ff8a3d" }}>
          홈으로 돌아가기
        </button>
      </div>
    </main>
  );
}
