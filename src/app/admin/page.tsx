"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, MatchRequest, MdRecommendation } from "@/lib/types";
import { regionLabel, FILTER_ITEMS } from "@/lib/options";
import LogoutButton from "@/components/LogoutButton";

const PER_PAGE = 20;

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

function statusLabel(s: string) {
  const m: Record<string, { text: string; cls: string }> = {
    pending: { text: "승인대기", cls: "bg-warning/10 text-warning" },
    active: { text: "활성", cls: "bg-success/10 text-success" },
    blocked: { text: "차단", cls: "bg-danger/10 text-danger" },
    rejected: { text: "반려", cls: "bg-muted text-muted-fg" },
  };
  return m[s] || { text: s, cls: "bg-muted text-muted-fg" };
}

type MatchSummary = { total: number; pending: number; approved: number; rejected: number };

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [matchMap, setMatchMap] = useState<Map<string, MatchSummary>>(new Map());
  const [mdCountMap, setMdCountMap] = useState<Map<string, number>>(new Map());
  const [mdIds, setMdIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [matchFilter, setMatchFilter] = useState("");
  const [mdFilter, setMdFilter] = useState("");
  const [idealFilters, setIdealFilters] = useState<Record<string, string>>({});
  const [tempIdealFilters, setTempIdealFilters] = useState<Record<string, string>>({});
  const [showIdealFilters, setShowIdealFilters] = useState(false);
  const [page, setPage] = useState(1);

  const openIdealFilters = () => {
    setTempIdealFilters({ ...idealFilters });
    setShowIdealFilters(true);
  };
  const applyIdealFilters = () => {
    setIdealFilters({ ...tempIdealFilters });
    setPage(1);
    setShowIdealFilters(false);
  };
  const resetTempIdealFilters = () => setTempIdealFilters({});

  const matchIdealFilter = (u: User) => {
    for (const key of Object.keys(idealFilters)) {
      const want = idealFilters[key];
      if (!want) continue;
      if (key === "smoking") {
        const b = want === "유";
        if (u.smoking !== b) return false;
      } else if (key === "birthYear" || key === "height") {
        continue;
      } else {
        const val = (u as unknown as Record<string, unknown>)[key];
        if (String(val) !== want) return false;
      }
    }
    return true;
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/bootstrap");
    const {
      users: uData,
      matches: mData,
      mdRecs: mdData,
    }: { users: User[]; matches: MatchRequest[]; mdRecs: MdRecommendation[] } = await res.json();

    const mm = new Map<string, MatchSummary>();
    for (const u of uData) mm.set(u.id, { total: 0, pending: 0, approved: 0, rejected: 0 });
    for (const m of mData) {
      for (const uid of [m.femaleProfileId, m.maleProfileId]) {
        const s = mm.get(uid);
        if (s) {
          s.total++;
          if (m.status === "pending") s.pending++;
          else if (m.status === "approved") s.approved++;
          else if (m.status === "rejected") s.rejected++;
        }
      }
    }

    const mdMap = new Map<string, number>();
    const mdSet = new Set<string>();
    for (const md of mdData) {
      mdSet.add(md.maleProfileId);
      mdSet.add(md.femaleProfileId);
      mdMap.set(md.maleProfileId, (mdMap.get(md.maleProfileId) || 0) + 1);
      mdMap.set(md.femaleProfileId, (mdMap.get(md.femaleProfileId) || 0) + 1);
    }

    setUsers(uData);
    setMatchMap(mm);
    setMdCountMap(mdMap);
    setMdIds(mdSet);
    setLoading(false);
  };

  const patchStatus = (id: string, updates: Record<string, unknown>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } as User : u));
    fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
  };

  const handleApprove = (id: string) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    patchStatus(id, { status: "active", expiresAt: expires.toISOString() });
  };

  const handleReject = (id: string) => patchStatus(id, { status: "rejected" });
  const handleBlock = (id: string) => patchStatus(id, { status: "blocked" });
  const handleUnblock = (id: string) => patchStatus(id, { status: "active" });

  const filtered = users.filter((u) => {
    if (search.length >= 2 && !u.realName.includes(search) && !u.phone.includes(search)) return false;
    if (search.length === 1) return true;
    if (statusFilter && u.status !== statusFilter) return false;
    if (genderFilter && u.role !== genderFilter) return false;
    if (matchFilter) {
      const ms = matchMap.get(u.id);
      if (matchFilter === "has_match" && (!ms || ms.total === 0)) return false;
      if (matchFilter === "has_approved" && (!ms || ms.approved === 0)) return false;
      if (matchFilter === "has_pending" && (!ms || ms.pending === 0)) return false;
      if (matchFilter === "has_rejected" && (!ms || ms.rejected === 0)) return false;
      if (matchFilter === "no_match" && ms && ms.total > 0) return false;
    }
    if (mdFilter === "has_md" && !mdIds.has(u.id)) return false;
    if (mdFilter === "no_md" && mdIds.has(u.id)) return false;
    if (!matchIdealFilter(u)) return false;
    return true;
  });
  const idealActiveCount = Object.values(idealFilters).filter(Boolean).length;
  const tempIdealActiveCount = Object.values(tempIdealFilters).filter(Boolean).length;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/header_logo.png" alt="모두의 소개팅 MOSO" className="h-9 w-auto" />
            <span className="text-sm font-normal text-white/80">관리자</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="이름/전화번호 검색 (2글자 이상)"
            className="px-4 py-2.5 rounded-xl border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary/30 w-64" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-border bg-white text-base">
            <option value="">전체 상태</option>
            <option value="pending">승인대기</option>
            <option value="active">활성</option>
            <option value="blocked">차단</option>
            <option value="rejected">반려</option>
          </select>
          <select value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-border bg-white text-base">
            <option value="">전체 성별</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
          <select value={matchFilter} onChange={(e) => { setMatchFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-border bg-white text-base">
            <option value="">전체 매칭</option>
            <option value="has_match">매칭 있음</option>
            <option value="has_approved">매칭 확정 있음</option>
            <option value="has_pending">대기중 있음</option>
            <option value="has_rejected">거절 있음</option>
            <option value="no_match">매칭 없음</option>
          </select>
          <select value={mdFilter} onChange={(e) => { setMdFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-border bg-white text-base">
            <option value="">전체 MD 추천</option>
            <option value="has_md">MD 추천 이력 있음</option>
            <option value="no_md">MD 추천 이력 없음</option>
          </select>
          <button
            onClick={openIdealFilters}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              idealActiveCount > 0
                ? "bg-[#ff8a3d]/10 border-[#ff8a3d]/30 text-[#ff8a3d]"
                : "bg-white border-border hover:border-[#ff8a3d]/30"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            이상형 필터
            {idealActiveCount > 0 && (
              <span className="text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#ff8a3d" }}>
                {idealActiveCount}
              </span>
            )}
          </button>
          {idealActiveCount > 0 && (
            <button
              onClick={() => { setIdealFilters({}); setPage(1); }}
              className="text-xs text-danger hover:underline"
            >
              이상형 초기화
            </button>
          )}
          <span className="text-base text-muted-fg font-medium">{filtered.length}명</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-5 bg-card rounded-2xl border border-border animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-gray-200 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded" />
                  <div className="h-3 w-1/4 bg-gray-200 rounded" />
                </div>
                <div className="w-16 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {paged.map((u) => {
              const st = statusLabel(u.status);
              const expired = u.expiresAt && new Date(u.expiresAt) < new Date();
              const ms = matchMap.get(u.id);
              return (
                <div key={u.id} className={`flex items-center gap-4 p-5 bg-card rounded-2xl border border-border hover:shadow-md transition-all cursor-pointer ${expired ? "border-danger/30 bg-danger/5" : ""}`}
                  onClick={() => router.push(`/admin/${u.id}`)}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {u.photoUrls[0] ? <img src={u.photoUrls[0]} alt={u.nickname} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary/20">{u.nickname?.[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">{u.realName}</h3>
                      <span className="text-sm text-muted-fg">({u.nickname})</span>
                      {isNew(u.createdAt) && <span className="text-xs font-bold text-white bg-primary px-2 py-0.5 rounded-md">NEW</span>}
                      {mdIds.has(u.id) && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: "#7c5cfc" }}>
                          MD {mdCountMap.get(u.id) ?? ""}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-fg">{u.role === "male" ? "남성" : "여성"}</span>
                      {ms && ms.total > 0 && (
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ms.approved > 0 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                          매칭 {ms.total}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-fg mt-1 truncate">{u.birthYear}년생 · {u.height}cm · {regionLabel(u.city, u.district)} · {u.workplace} · {u.mbti}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {u.expiresAt && <p className={`text-xs ${expired ? "text-danger font-semibold" : "text-muted-fg"}`}>만료: {new Date(u.expiresAt).toLocaleDateString("ko-KR")}</p>}
                      {ms && ms.total > 0 && (
                        <p className="text-xs text-muted-fg">
                          {ms.pending > 0 && <span className="text-warning">대기 {ms.pending}</span>}
                          {ms.pending > 0 && (ms.approved > 0 || ms.rejected > 0) && " · "}
                          {ms.approved > 0 && <span className="text-success">수락 {ms.approved}</span>}
                          {ms.approved > 0 && ms.rejected > 0 && " · "}
                          {ms.rejected > 0 && <span className="text-danger">거절 {ms.rejected}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {u.status === "pending" && (
                      <>
                        <button onClick={() => handleApprove(u.id)} className="px-4 py-2 bg-success text-white text-sm font-semibold rounded-lg hover:bg-success/80 transition-colors">승인</button>
                        <button onClick={() => handleReject(u.id)} className="px-4 py-2 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-danger/80 transition-colors">반려</button>
                      </>
                    )}
                    {u.status === "active" && (
                      <button onClick={() => handleBlock(u.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-muted text-muted-fg hover:bg-danger/10 hover:text-danger transition-colors">차단</button>
                    )}
                    {u.status === "blocked" && (
                      <button onClick={() => handleUnblock(u.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-muted text-muted-fg hover:bg-success/10 hover:text-success transition-colors">해제</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showIdealFilters && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-[60]"
              onClick={() => setShowIdealFilters(false)}
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto animate-scaleIn">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <button onClick={resetTempIdealFilters} className="text-sm text-muted-fg hover:text-foreground transition-colors">
                    초기화
                  </button>
                  <h3 className="text-lg font-bold">이상형 필터</h3>
                  <button onClick={() => setShowIdealFilters(false)} className="text-muted-fg hover:text-foreground transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto">
                  {FILTER_ITEMS.map((fo) => (
                    <div key={fo.key}>
                      <label className="text-sm font-semibold text-foreground mb-2 block">{fo.label}</label>
                      {fo.type === "select" ? (
                        <select
                          value={tempIdealFilters[fo.key] || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setTempIdealFilters((p) => { if (!v) { const n = { ...p }; delete n[fo.key]; return n; } return { ...p, [fo.key]: v }; });
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ff8a3d]/30">
                          <option value="">전체</option>
                          {fo.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              setTempIdealFilters((p) => {
                                const n = { ...p };
                                delete n[fo.key];
                                return n;
                              })
                            }
                            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                              !tempIdealFilters[fo.key]
                                ? "text-white border-transparent"
                                : "bg-white border-border text-muted-fg hover:border-gray-400"
                            }`}
                            style={!tempIdealFilters[fo.key] ? { backgroundColor: "#ff8a3d" } : {}}
                          >
                            전체
                          </button>
                          {fo.options.map((o) => (
                            <button
                              key={o}
                              onClick={() => setTempIdealFilters((p) => ({ ...p, [fo.key]: o }))}
                              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                                tempIdealFilters[fo.key] === o
                                  ? "text-white border-transparent"
                                  : "bg-white border-border text-foreground hover:border-gray-400"
                              }`}
                              style={tempIdealFilters[fo.key] === o ? { backgroundColor: "#ff8a3d" } : {}}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 border-t border-border">
                  <button
                    onClick={applyIdealFilters}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all hover:opacity-90"
                    style={{ backgroundColor: "#ff8a3d" }}
                  >
                    {tempIdealActiveCount > 0 ? `필터 적용하기 (${tempIdealActiveCount}개)` : "전체 보기"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

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

      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scaleIn { animation: scaleIn 0.18s ease-out; }
      `}</style>
    </main>
  );
}
