"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, MatchRequest, MdRecommendation, IdealType } from "@/lib/types";
import { regionLabel, FILTER_ITEMS, CITIES, EDUCATIONS, WORKPLACES, SALARIES, MBTI_TYPES, JOBS } from "@/lib/options";
import LogoutButton from "@/components/LogoutButton";
import {
  type MultiFilters, activeCount, toggleFilterValue, setFilterAll, clearFilterKey,
  matchInfoFilters,
} from "@/lib/filter";

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
  const [infoFilters, setInfoFilters] = useState<MultiFilters>({});
  const [tempInfoFilters, setTempInfoFilters] = useState<MultiFilters>({});
  const [showInfoFilters, setShowInfoFilters] = useState(false);
  const [idealMap, setIdealMap] = useState<Map<string, IdealType>>(new Map());
  const [idealFilters, setIdealFilters] = useState<MultiFilters>({});
  const [tempIdealFilters, setTempIdealFilters] = useState<MultiFilters>({});
  const [showIdealFilters, setShowIdealFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const infoJobRef = useRef<HTMLDivElement | null>(null);

  // 직장이 정확히 1개일 때만 직업 sub-filter 노출
  const singleSelectedWorkplace = (tempInfoFilters.workplace && tempInfoFilters.workplace.length === 1)
    ? tempInfoFilters.workplace[0]
    : null;

  useEffect(() => {
    if (showInfoFilters && singleSelectedWorkplace && infoJobRef.current) {
      infoJobRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [singleSelectedWorkplace, showInfoFilters]);

  const openInfoFilters = () => {
    setTempInfoFilters({ ...infoFilters });
    setShowInfoFilters(true);
  };
  const applyInfoFilters = () => {
    setInfoFilters({ ...tempInfoFilters });
    setPage(1);
    setShowInfoFilters(false);
  };
  const resetTempInfoFilters = () => setTempInfoFilters({});

  const matchInfoFilter = (u: User) => matchInfoFilters(u, infoFilters);

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

  // 이상형 필터: 유저가 등록한 이상형 정보(idealCities 등 배열, idealSmoking)에 매칭
  // 각 키별로 wants(배열) 중 하나라도 매칭되면 통과 (OR 매칭).
  const matchIdealFilter = (u: User) => {
    const keys = Object.keys(idealFilters);
    if (keys.length === 0) return true;
    const it = idealMap.get(u.id);
    if (!it) return false; // 이상형 미등록 유저는 필터 활성화 시 제외
    for (const key of keys) {
      const wants = idealFilters[key] ?? [];
      if (wants.length === 0) continue;
      if (key === "idealSmoking") {
        const ok = wants.some((want) => {
          if (want === "상관없음") return it.idealSmoking === null;
          const b = want === "유";
          return it.idealSmoking === b;
        });
        if (!ok) return false;
      } else {
        const arr = (it as unknown as Record<string, unknown>)[key];
        if (!Array.isArray(arr)) return false;
        // 회원이 선호하는 항목에 wants 중 하나라도 포함되어야 함
        const ok = wants.some((w) => (arr as string[]).includes(w));
        if (!ok) return false;
      }
    }
    return true;
  };

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/bootstrap");
    const {
      users: uData,
      matches: mData,
      mdRecs: mdData,
      idealTypes: itData = [],
    }: {
      users: User[];
      matches: MatchRequest[];
      mdRecs: MdRecommendation[];
      idealTypes?: IdealType[];
    } = await res.json();

    const im = new Map<string, IdealType>();
    for (const it of itData) im.set(it.userId, it);
    setIdealMap(im);

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

  useEffect(() => { fetchData(); }, []);

  const patchStatus = (id: string, updates: Record<string, unknown>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } as User : u));
    fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
  };

  const handleApprove = (id: string) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    patchStatus(id, { status: "active", expiresAt: expires.toISOString() });
  };

  const openRejectModal = (u: User) => {
    setRejectTarget(u);
    setRejectReason(u.rejectionReason ?? "");
  };
  const closeRejectModal = () => {
    setRejectTarget(null);
    setRejectReason("");
  };
  const submitReject = () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      alert("반려 사유를 5자 이상 입력해주세요.\n반려 사유는 회원에게 안내되며, 사진 / 내용 등 어떤 부분을 보완해야 하는지 알 수 있도록 구체적으로 작성해주세요.");
      return;
    }
    patchStatus(rejectTarget.id, { status: "rejected", rejectionReason: reason });
    closeRejectModal();
  };
  const handleUnreject = (id: string) => {
    if (
      window.confirm(
        "이 회원의 반려를 취소하고 '승인 대기' 상태로 되돌리시겠습니까?\n\n다시 로그인하면 정상적으로 가입 절차를 진행할 수 있게 됩니다.",
      )
    ) {
      patchStatus(id, { status: "pending" });
    }
  };
  const handleBlock = (id: string) => patchStatus(id, { status: "blocked" });
  const handleUnblock = (id: string) => patchStatus(id, { status: "active" });

  const filtered = users.filter((u) => {
    if (search.length >= 2) {
      const q = search.trim();
      const qDigits = q.replace(/[^0-9]/g, "");
      const nameMatch = u.realName.includes(q);
      const phoneMatch = u.phone.includes(q);
      // 전화번호 검색은 하이픈 없이도 가능하도록 숫자만 추출해서 비교
      const phoneDigitsMatch = qDigits.length >= 2 && u.phone.replace(/[^0-9]/g, "").includes(qDigits);
      if (!nameMatch && !phoneMatch && !phoneDigitsMatch) return false;
    }
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
    if (!matchInfoFilter(u)) return false;
    if (!matchIdealFilter(u)) return false;
    return true;
  });
  const infoActiveCount = activeCount(infoFilters);
  const tempInfoActiveCount = activeCount(tempInfoFilters);
  const idealActiveCount = activeCount(idealFilters);
  const tempIdealActiveCount = activeCount(tempIdealFilters);
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
            onClick={openInfoFilters}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              infoActiveCount > 0
                ? "bg-[#ff8a3d]/10 border-[#ff8a3d]/30 text-[#ff8a3d]"
                : "bg-white border-border hover:border-[#ff8a3d]/30"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            정보 필터
            {infoActiveCount > 0 && (
              <span className="text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#ff8a3d" }}>
                {infoActiveCount}
              </span>
            )}
          </button>
          {infoActiveCount > 0 && (
            <button
              onClick={() => { setInfoFilters({}); setPage(1); }}
              className="text-xs text-danger hover:underline"
            >
              정보 초기화
            </button>
          )}
          <button
            onClick={openIdealFilters}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              idealActiveCount > 0
                ? "bg-[#7c5cfc]/10 border-[#7c5cfc]/40 text-[#7c5cfc]"
                : "bg-white border-border hover:border-[#7c5cfc]/40"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            이상형 필터
            {idealActiveCount > 0 && (
              <span className="text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#7c5cfc" }}>
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
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${u.role === "male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>{u.role === "male" ? "남성" : "여성"}</span>
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
                        <button onClick={() => openRejectModal(u)} className="px-4 py-2 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-danger/80 transition-colors">반려</button>
                      </>
                    )}
                    {u.status === "active" && (
                      <button onClick={() => handleBlock(u.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-muted text-muted-fg hover:bg-danger/10 hover:text-danger transition-colors">차단</button>
                    )}
                    {u.status === "blocked" && (
                      <button onClick={() => handleUnblock(u.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-muted text-muted-fg hover:bg-success/10 hover:text-success transition-colors">해제</button>
                    )}
                    {u.status === "rejected" && (
                      <button onClick={() => handleUnreject(u.id)} className="px-4 py-2 text-sm font-semibold rounded-lg border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 transition-colors">반려 취소</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showInfoFilters && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-[60]"
              onClick={() => setShowInfoFilters(false)}
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto animate-scaleIn">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <button onClick={resetTempInfoFilters} className="text-sm text-muted-fg hover:text-foreground transition-colors">
                    초기화
                  </button>
                  <h3 className="text-lg font-bold">정보 필터</h3>
                  <button onClick={() => setShowInfoFilters(false)} className="text-muted-fg hover:text-foreground transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto">
                  {FILTER_ITEMS.map((fo) => {
                    const selected = tempInfoFilters[fo.key] ?? [];
                    const allSelected = selected.length === fo.options.length && fo.options.length > 0;
                    return (
                      <div key={fo.key}>
                        <label className="text-sm font-semibold text-foreground mb-2 block">
                          {fo.label} {selected.length > 0 && <span className="text-xs text-[#ff8a3d]">· {selected.length}개</span>}
                        </label>
                        <div className="flex gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setTempInfoFilters((p) => setFilterAll(p, fo.key, fo.options))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              allSelected ? "text-white border-transparent" : "bg-white text-foreground border-border"
                            }`}
                            style={allSelected ? { backgroundColor: "#ff8a3d" } : {}}
                          >
                            전체 선택
                          </button>
                          <button
                            type="button"
                            onClick={() => setTempInfoFilters((p) => {
                              const n = clearFilterKey(p, fo.key);
                              if (fo.key === "workplace") return clearFilterKey(n, "job");
                              return n;
                            })}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-muted-fg border border-border"
                          >
                            무관 (전체)
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {fo.options.map((o) => {
                            const isOn = selected.includes(o);
                            return (
                              <button
                                key={o}
                                onClick={() => setTempInfoFilters((p) => {
                                  const n = toggleFilterValue(p, fo.key, o);
                                  if (fo.key === "workplace") return clearFilterKey(n, "job");
                                  return n;
                                })}
                                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                                  isOn ? "text-white border-transparent" : "bg-white border-border text-foreground hover:border-gray-400"
                                }`}
                                style={isOn ? { backgroundColor: "#ff8a3d" } : {}}
                              >
                                {o}
                              </button>
                            );
                          })}
                        </div>
                        {fo.key === "workplace" && singleSelectedWorkplace && JOBS[singleSelectedWorkplace]?.length > 0 && (
                          <div ref={infoJobRef} className="mt-3 pl-3 border-l-2 border-[#ff8a3d]/30 scroll-mt-4">
                            <label className="text-xs font-semibold text-muted-fg mb-2 block">└ 직업 (직장 1개 선택 시)</label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setTempInfoFilters((p) => clearFilterKey(p, "job"))}
                                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                                  !tempInfoFilters.job || tempInfoFilters.job.length === 0
                                    ? "text-white border-transparent"
                                    : "bg-white border-border text-muted-fg hover:border-gray-400"
                                }`}
                                style={!tempInfoFilters.job || tempInfoFilters.job.length === 0 ? { backgroundColor: "#ff8a3d" } : {}}
                              >
                                전체
                              </button>
                              {JOBS[singleSelectedWorkplace].map((j) => {
                                const isOn = (tempInfoFilters.job ?? []).includes(j);
                                return (
                                  <button
                                    key={j}
                                    onClick={() => setTempInfoFilters((p) => toggleFilterValue(p, "job", j))}
                                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                                      isOn ? "text-white border-transparent" : "bg-white border-border text-foreground hover:border-gray-400"
                                    }`}
                                    style={isOn ? { backgroundColor: "#ff8a3d" } : {}}
                                  >
                                    {j}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 py-4 border-t border-border">
                  <button
                    onClick={applyInfoFilters}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all hover:opacity-90"
                    style={{ backgroundColor: "#ff8a3d" }}
                  >
                    {tempInfoActiveCount > 0 ? `필터 적용하기 (${tempInfoActiveCount}개)` : "전체 보기"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {showIdealFilters && (() => {
          const idealItems: { key: string; label: string; options: readonly string[] }[] = [
            { key: "idealCities", label: "선호 지역", options: CITIES },
            { key: "idealEducation", label: "선호 학력", options: EDUCATIONS },
            { key: "idealWorkplaces", label: "선호 직장", options: WORKPLACES },
            { key: "idealSalaries", label: "선호 연봉", options: SALARIES },
            { key: "idealMbti", label: "선호 MBTI", options: MBTI_TYPES },
            { key: "idealSmoking", label: "흡연 선호", options: ["무", "유", "상관없음"] },
          ];
          return (
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

                  <div className="px-6 py-4 bg-[#7c5cfc]/5 border-b border-[#7c5cfc]/10">
                    <p className="text-xs text-[#7c5cfc] font-medium leading-relaxed">
                      회원이 등록한 <b>이상형 선호 정보</b>를 기준으로 필터링합니다. (예: &quot;선호 지역 = 서울특별시&quot; 선택 시, 이상형 선호 지역에 서울을 포함한 회원만 표시)
                    </p>
                  </div>

                  <div className="px-6 py-5 space-y-5 overflow-y-auto">
                    {idealItems.map((fo) => {
                      const selected = tempIdealFilters[fo.key] ?? [];
                      const allSelected = selected.length === fo.options.length && fo.options.length > 0;
                      return (
                        <div key={fo.key}>
                          <label className="text-sm font-semibold text-foreground mb-2 block">
                            {fo.label} {selected.length > 0 && <span className="text-xs text-[#7c5cfc]">· {selected.length}개</span>}
                          </label>
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setTempIdealFilters((p) => setFilterAll(p, fo.key, fo.options))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                allSelected ? "text-white border-transparent" : "bg-white text-foreground border-border"
                              }`}
                              style={allSelected ? { backgroundColor: "#7c5cfc" } : {}}
                            >
                              전체 선택
                            </button>
                            <button
                              type="button"
                              onClick={() => setTempIdealFilters((p) => clearFilterKey(p, fo.key))}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-muted-fg border border-border"
                            >
                              무관
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {fo.options.map((o) => {
                              const isOn = selected.includes(o);
                              return (
                                <button
                                  key={o}
                                  onClick={() => setTempIdealFilters((p) => toggleFilterValue(p, fo.key, o))}
                                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                                    isOn ? "text-white border-transparent" : "bg-white border-border text-foreground hover:border-gray-400"
                                  }`}
                                  style={isOn ? { backgroundColor: "#7c5cfc" } : {}}
                                >
                                  {o}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-6 py-4 border-t border-border">
                    <button
                      onClick={applyIdealFilters}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all hover:opacity-90"
                      style={{ backgroundColor: "#7c5cfc" }}
                    >
                      {tempIdealActiveCount > 0 ? `필터 적용하기 (${tempIdealActiveCount}개)` : "전체 보기"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

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

        {rejectTarget && (
          <>
            <div className="fixed inset-0 bg-black/40 z-[60]" onClick={closeRejectModal} />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col pointer-events-auto animate-scaleIn">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-bold text-danger">회원 반려</h3>
                  <button onClick={closeRejectModal} className="text-muted-fg hover:text-foreground" aria-label="닫기">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-muted-fg">
                    <b className="text-foreground">{rejectTarget.realName} ({rejectTarget.nickname})</b> 회원을 반려합니다.
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">반려 사유 (필수)</label>
                    <textarea
                      autoFocus
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="예) 대표사진의 얼굴이 너무 작게 찍혀 있어 잘 보이지 않습니다. 다른 사진으로 교체 후 재신청 부탁드립니다."
                      rows={5}
                      maxLength={500}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-danger/30 resize-none"
                    />
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-fg">
                      <span>회원에게 안내되는 메시지입니다. 보완해야 할 부분을 구체적으로 작성해주세요.</span>
                      <span>{rejectReason.length}/500</span>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border flex gap-2">
                  <button
                    onClick={closeRejectModal}
                    className="flex-1 py-3 rounded-xl bg-white border border-border text-muted-fg font-semibold hover:bg-muted/40 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={submitReject}
                    disabled={rejectReason.trim().length < 5}
                    className="flex-1 py-3 rounded-xl bg-danger text-white font-bold hover:bg-danger/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    반려하기
                  </button>
                </div>
              </div>
            </div>
          </>
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
