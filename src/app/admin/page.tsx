"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, MatchRequest } from "@/lib/types";
import { regionLabel } from "@/lib/options";

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

type MatchSummary = {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
};

function buildMatchMap(matches: MatchRequest[], users: User[]) {
  const map = new Map<string, MatchSummary>();
  for (const u of users) map.set(u.id, { total: 0, pending: 0, accepted: 0, rejected: 0 });

  for (const m of matches) {
    for (const uid of [m.fromUserId, m.toUserId]) {
      const s = map.get(uid);
      if (s) {
        s.total++;
        if (m.action === "pending") s.pending++;
        else if (m.action === "accepted") s.accepted++;
        else if (m.action === "rejected") s.rejected++;
      }
    }
  }
  return map;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [matchMap, setMatchMap] = useState<Map<string, MatchSummary>>(new Map());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [matchFilter, setMatchFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [uRes, mRes] = await Promise.all([
      fetch("/api/profiles"),
      fetch("/api/match?all=true"),
    ]);
    const uData: User[] = await uRes.json();
    const mData: MatchRequest[] = await mRes.json();
    setUsers(uData);
    setMatches(mData);
    setMatchMap(buildMatchMap(mData, uData));
    setLoading(false);
  };

  // TODO: 실제 Google OAuth 연동 시 admins 테이블 체크로 교체
  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    await fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "approved", expiresAt: expires.toISOString() }) });
    fetchData();
  };

  const handleReject = async (id: string) => {
    await fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "rejected" }) });
    fetchData();
  };

  const handleBlock = async (id: string) => {
    await fetch("/api/profiles/block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchData();
  };

  const filtered = users.filter((u) => {
    if (search && !u.name.includes(search)) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (genderFilter && u.gender !== genderFilter) return false;
    if (matchFilter) {
      const ms = matchMap.get(u.id);
      if (matchFilter === "has_match" && (!ms || ms.total === 0)) return false;
      if (matchFilter === "has_accepted" && (!ms || ms.accepted === 0)) return false;
      if (matchFilter === "has_pending" && (!ms || ms.pending === 0)) return false;
      if (matchFilter === "has_rejected" && (!ms || ms.rejected === 0)) return false;
      if (matchFilter === "no_match" && ms && ms.total > 0) return false;
    }
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">OUR<span className="text-primary">MO</span> <span className="text-sm font-normal text-muted-fg">관리자</span></h1>
          <Link href="/" className="text-xs text-muted-fg hover:text-foreground">홈으로</Link>
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
          <select value={matchFilter} onChange={(e) => { setMatchFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">전체 매칭</option>
            <option value="has_match">매칭 있음</option>
            <option value="has_accepted">수락된 매칭</option>
            <option value="has_pending">대기중 매칭</option>
            <option value="has_rejected">거절된 매칭</option>
            <option value="no_match">매칭 없음</option>
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
              const ms = matchMap.get(u.id);
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
                      {/* Match badge */}
                      {ms && ms.total > 0 && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${ms.accepted > 0 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                          매칭 {ms.total}
                          {ms.accepted > 0 && <span className="text-primary">(수락 {ms.accepted})</span>}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-fg mt-0.5 truncate">{u.birthYear} · {u.height}cm · {regionLabel(u.city, u.district)} · {u.jobType} · {u.mbti}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {u.expiresAt && <p className={`text-[10px] ${expired ? "text-danger font-semibold" : "text-muted-fg"}`}>만료: {new Date(u.expiresAt).toLocaleDateString("ko-KR")}</p>}
                      {/* Match detail line */}
                      {ms && ms.total > 0 && (
                        <p className="text-[10px] text-muted-fg">
                          {ms.pending > 0 && <span className="text-warning">대기 {ms.pending}</span>}
                          {ms.pending > 0 && (ms.accepted > 0 || ms.rejected > 0) && " · "}
                          {ms.accepted > 0 && <span className="text-success">수락 {ms.accepted}</span>}
                          {ms.accepted > 0 && ms.rejected > 0 && " · "}
                          {ms.rejected > 0 && <span className="text-danger">거절 {ms.rejected}</span>}
                        </p>
                      )}
                    </div>
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
