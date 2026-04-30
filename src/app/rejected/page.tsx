"use client";

import { useRouter } from "next/navigation";

export default function RejectedPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "#ff8a3d" }}>
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center space-y-5 max-w-sm w-full">
        <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">가입이 반려되었습니다</h2>
        <button onClick={() => router.push("/")}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-md"
          style={{ backgroundColor: "#ff8a3d" }}>
          홈으로
        </button>
      </div>
    </main>
  );
}
