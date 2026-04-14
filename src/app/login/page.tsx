"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card rounded-3xl shadow-xl p-10 text-center space-y-6 max-w-md w-full">
        <h2 className="text-2xl font-bold">로그인</h2>
        <p className="text-muted-fg">Google OAuth 연동 후 이용 가능합니다.</p>
        <button onClick={() => router.push("/")} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
          홈으로
        </button>
      </div>
    </main>
  );
}
