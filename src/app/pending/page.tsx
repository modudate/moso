"use client";

import { useRouter } from "next/navigation";

export default function PendingPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "#ff8a3d" }}>
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center space-y-5 max-w-sm w-full">
        <div className="w-16 h-16 mx-auto rounded-full bg-yellow-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">승인 대기 중</h2>
        <p className="text-gray-500 leading-relaxed">
          가입 신청이 완료되었습니다.<br />
          관리자 승인 후 서비스를 이용하실 수 있습니다.
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
