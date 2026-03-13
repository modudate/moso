"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      localStorage.setItem("ourmo_user", JSON.stringify(data.user));
      if (data.user.gender === "여자") router.push("/female");
      else router.push("/male");
    } catch { setError("서버 오류"); } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white px-4">
      <div className="bg-card rounded-3xl shadow-xl p-10 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">OUR<span className="text-primary">MO</span> 로그인</h1>
          <p className="text-muted-fg text-sm">이메일과 비밀번호를 입력하세요</p>
        </div>
        <div className="bg-muted rounded-lg px-4 py-3 text-xs text-muted-fg space-y-1">
          <p className="font-semibold text-foreground">데모 계정</p>
          <p>여성: jiwoo@test.com / 1234</p>
          <p>남성: hyunwoo@test.com / 1234</p>
        </div>
        <div className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일"
            className="w-full px-5 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호"
            className="w-full px-5 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          {error && <p className="text-sm text-danger text-center">{error}</p>}
        </div>
        <button onClick={handleLogin} disabled={loading || !email || !password}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-40">
          {loading ? "로그인 중..." : "로그인"}
        </button>
        <p className="text-center text-sm text-muted-fg">
          아직 회원이 아니신가요? <Link href="/register" className="text-primary hover:underline">회원가입</Link>
        </p>
      </div>
    </main>
  );
}
