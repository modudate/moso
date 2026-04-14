"use client";

import { useRouter } from "next/navigation";

export default function BlockedPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "#ff8a3d" }}>
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center space-y-5 max-w-sm w-full">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">서비스 이용 제한</h2>
        <p className="text-gray-500 leading-relaxed">
          현재 서비스 이용이 제한된 상태입니다.<br />
          자세한 내용은 관리자에게 문의해주세요.
        </p>
        <button onClick={() => router.push("/")}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-md"
          style={{ backgroundColor: "#ff8a3d" }}>
          홈으로
        </button>
      </div>
    </main>
  );
}
