"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { regionLabel } from "@/lib/options";

const ADMIN_PW = "ourmo2026";
const PER_PAGE = 20;

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

function statusLabel(s: string) {
  const m: Record<string, { text: string; cls: string }> = {
    pending: { text: "승인대기", cls: "bg-warning/10 text-warning" },
    approved: { text: "승인됨", cls: "bg-success/10 text-success" },
    rejected: { text: "반려됨", cls: "bg-danger/10 text-danger" },
    blocked: { text: "차단됨", cls: "bg-muted text-muted-fg" },
  };
  return m[s] || { text: s, cls: "bg-muted text-muted-fg" };
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/profiles");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { if (authed) fetchUsers(); }, [authed]);

  const handleLogin = () => { if (pw === ADMIN_PW) setAuthed(true); };

  const handleApprove = async (id: string) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    await fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "approved", expiresAt: expires.toISOString() }) });
    fetchUsers();
  };

  const handleReject = async (id: string) => {
    await fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "rejected" }) });
    fetchUsers();
  };

  const handleBlock = async (id: string) => {
    await fetch("/api/profiles/block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchUsers();
  };

  const handleExpiresChange = async (id: string, date: string) => {
    await fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, expiresAt: new Date(date).toISOString() }) });
    fetchUsers();
  };

  const filtered = users.filter((u) => {
    if (search && !u.name.includes(search)) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (genderFilter && u.gender !== genderFilter) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white px-4">
        <div className="bg-card rounded-3xl shadow-xl p-10 max-w-sm w-full space-y-6">
          <h1 className="text-2xl font-bold text-center">관리자 로그인</h1>
          <p className="text-center text-xs text-muted-fg bg-muted rounded-lg px-3 py-2">데모 비밀번호: {ADMIN_PW}</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호"
            className="w-full px-5 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <button onClick={handleLogin} className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">로그인</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">OUR<span className="text-primary">MO</span> <span className="text-sm font-normal text-muted-fg">관리자</span></h1>
          <button onClick={() => setAuthed(false)} className="text-xs text-muted-fg hover:text-foreground">로그아웃</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="이름 검색"
            className="px-4 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-48" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">전체 상태</option>
            <option value="pending">승인대기</option>
            <option value="approved">승인됨</option>
            <option value="rejected">반려됨</option>
          </select>
          <select value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">전체 성별</option>
            <option value="남자">남자</option>
            <option value="여자">여자</option>
          </select>
          <span className="text-sm text-muted-fg">{filtered.length}명</span>
        </div>

        {loading ? (
          <div className="text-center py-20"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-3">
            {paged.map((u) => {
              const st = statusLabel(u.status);
              const expired = u.expiresAt && new Date(u.expiresAt) < new Date();
              return (
                <div key={u.id} className={`flex items-center gap-3 sm:gap-4 p-4 bg-card rounded-2xl border border-border hover:shadow-md transition-all cursor-pointer ${u.blocked ? "opacity-50 line-through" : ""} ${expired ? "border-danger/30 bg-danger/5" : ""}`}
                  onClick={() => router.push(`/admin/${u.id}`)}>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {u.imageUrl ? <img src={u.imageUrl} alt={u.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary/20">{u.name?.[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base">{u.name}</h3>
                      {isNew(u.createdAt) && <span className="text-[10px] font-bold text-white bg-primary px-1.5 py-0.5 rounded-md">NEW</span>}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-fg">{u.gender}</span>
                    </div>
                    <p className="text-xs text-muted-fg mt-0.5 truncate">{u.birthYear} · {u.height}cm · {regionLabel(u.city, u.district)} · {u.jobType} · {u.mbti}</p>
                    {u.expiresAt && <p className={`text-[10px] mt-0.5 ${expired ? "text-danger font-semibold" : "text-muted-fg"}`}>만료: {new Date(u.expiresAt).toLocaleDateString("ko-KR")}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {u.status === "pending" && (
                      <>
                        <button onClick={() => handleApprove(u.id)} className="px-3 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:bg-success/80 transition-colors">승인</button>
                        <button onClick={() => handleReject(u.id)} className="px-3 py-1.5 bg-danger text-white text-xs font-semibold rounded-lg hover:bg-danger/80 transition-colors">반려</button>
                      </>
                    )}
                    {u.status === "approved" && (
                      <button onClick={() => handleBlock(u.id)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${u.blocked ? "bg-muted text-muted-fg hover:bg-success/10 hover:text-success" : "bg-muted text-muted-fg hover:bg-danger/10 hover:text-danger"}`}>
                        {u.blocked ? "차단해제" : "차단"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${page === i + 1 ? "bg-primary text-white" : "bg-white border border-border hover:border-primary/30"}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
