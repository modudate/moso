"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  // 필터 상태를 sessionStorage 에 저장해 회원 상세 → 뒤로가기 시 복원
  // (운영팀 요청: 같은 필터로 회원 여러 명을 연속 확인할 때 매번 다시 거는 게 번거롭다)
  const FILTER_KEY = "admin_filter_state_v1";
  const initialFilters = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(FILTER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [search, setSearch] = useState<string>(initialFilters?.search ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters?.statusFilter ?? "");
  const [genderFilter, setGenderFilter] = useState<string>(initialFilters?.genderFilter ?? "");
  const [matchFilter, setMatchFilter] = useState<string>(initialFilters?.matchFilter ?? "");
  const [mdFilter, setMdFilter] = useState<string>(initialFilters?.mdFilter ?? "");
  const [infoFilters, setInfoFilters] = useState<MultiFilters>(initialFilters?.infoFilters ?? {});
  const [tempInfoFilters, setTempInfoFilters] = useState<MultiFilters>({});
  const [showInfoFilters, setShowInfoFilters] = useState(false);
  const [idealMap, setIdealMap] = useState<Map<string, IdealType>>(new Map());
  const [idealFilters, setIdealFilters] = useState<MultiFilters>(initialFilters?.idealFilters ?? {});
  const [tempIdealFilters, setTempIdealFilters] = useState<MultiFilters>({});
  const [showIdealFilters, setShowIdealFilters] = useState(false);
  const [page, setPage] = useState<number>(initialFilters?.page ?? 1);
  const [rejectTarget, setRejectTarget] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const infoJobRef = useRef<HTMLDivElement | null>(null);

  // 필터 상태가 바뀌면 sessionStorage 동기화
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        FILTER_KEY,
        JSON.stringify({
          search,
          statusFilter,
          genderFilter,
          matchFilter,
          mdFilter,
          infoFilters,
          idealFilters,
          page,
        }),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [search, statusFilter, genderFilter, matchFilter, mdFilter, infoFilters, idealFilters, page]);

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

  // 회원 상세에서 뒤로가기 시 스크롤 위치 복원
  useEffect(() => {
    if (loading) return;
    try {
      const y = sessionStorage.getItem("admin_scroll_y");
      if (y) {
        window.scrollTo(0, parseInt(y, 10));
        sessionStorage.removeItem("admin_scroll_y");
      }
    } catch {
      /* ignore */
    }
  }, [loading]);

  const patchStatus = (id: string, updates: Record<string, unknown>) => {
    const prev = users.find(u => u.id === id);
    setUsers(list => list.map(u => u.id === id ? { ...u, ...updates } as User : u));
    fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert("저장 실패: " + (data.error || res.statusText));
          // 낙관적 업데이트 롤백
          if (prev) setUsers(list => list.map(u => u.id === id ? prev : u));
        }
      })
      .catch((err) => {
        alert("네트워크 오류로 저장에 실패했습니다. 다시 시도해주세요.");
        if (prev) setUsers(list => list.map(u => u.id === id ? prev : u));
        console.error("[patchStatus] 저장 실패", err);
      });
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

  const resetAllFilters = () => {
    setSearch("");
    setStatusFilter("");
    setGenderFilter("");
    setMatchFilter("");
    setMdFilter("");
    setInfoFilters({});
    setIdealFilters({});
    setPage(1);
  };

  const hasAnyFilter =
    search.length >= 2 ||
    !!statusFilter ||
    !!genderFilter ||
    !!matchFilter ||
    !!mdFilter ||
    infoActiveCount > 0 ||
    idealActiveCount > 0;

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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6 items-start">
        {/* ── 필터 사이드바 ── */}
        <aside className="w-72 shrink-0 sticky top-[84px] self-start max-h-[calc(100vh-100px)] overflow-y-auto rounded-2xl border border-border bg-white shadow-sm">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">검색 · 필터</h2>
              <span className="text-sm font-semibold text-primary">{filtered.length}명</span>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="이름/전화번호 (2글자+)"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            <div className="space-y-2.5">
              <FilterSelect label="상태" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={[
                { value: "", label: "전체 상태" },
                { value: "pending", label: "승인대기" },
                { value: "active", label: "활성" },
                { value: "blocked", label: "차단" },
                { value: "rejected", label: "반려" },
              ]} />

              <FilterSelect label="성별" value={genderFilter} onChange={(v) => { setGenderFilter(v); setPage(1); }} options={[
                { value: "", label: "전체 성별" },
                { value: "male", label: "남성" },
                { value: "female", label: "여성" },
              ]} />

              <FilterSelect label="매칭" value={matchFilter} onChange={(v) => { setMatchFilter(v); setPage(1); }} options={[
                { value: "", label: "전체 매칭" },
                { value: "has_match", label: "매칭 있음" },
                { value: "has_approved", label: "매칭 확정 있음" },
                { value: "has_pending", label: "대기중 있음" },
                { value: "has_rejected", label: "거절 있음" },
                { value: "no_match", label: "매칭 없음" },
              ]} />

              <FilterSelect label="MD 추천" value={mdFilter} onChange={(v) => { setMdFilter(v); setPage(1); }} options={[
                { value: "", label: "전체 MD 추천" },
                { value: "has_md", label: "MD 추천 이력 있음" },
                { value: "no_md", label: "MD 추천 이력 없음" },
              ]} />
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <button
                onClick={openInfoFilters}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  infoActiveCount > 0
                    ? "bg-[#ff8a3d]/10 border-[#ff8a3d]/30 text-[#ff8a3d]"
                    : "bg-white border-border hover:border-[#ff8a3d]/30"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  정보 필터
                </span>
                {infoActiveCount > 0 && (
                  <span className="text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#ff8a3d" }}>
                    {infoActiveCount}
                  </span>
                )}
              </button>
              {infoActiveCount > 0 && (
                <button onClick={() => { setInfoFilters({}); setPage(1); }} className="w-full text-xs text-danger hover:underline text-left px-1">
                  정보 필터 초기화
                </button>
              )}

              <button
                onClick={openIdealFilters}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  idealActiveCount > 0
                    ? "bg-[#7c5cfc]/10 border-[#7c5cfc]/40 text-[#7c5cfc]"
                    : "bg-white border-border hover:border-[#7c5cfc]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  이상형 필터
                </span>
                {idealActiveCount > 0 && (
                  <span className="text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#7c5cfc" }}>
                    {idealActiveCount}
                  </span>
                )}
              </button>
              {idealActiveCount > 0 && (
                <button onClick={() => { setIdealFilters({}); setPage(1); }} className="w-full text-xs text-danger hover:underline text-left px-1">
                  이상형 필터 초기화
                </button>
              )}
            </div>

            {hasAnyFilter && (
              <button
                onClick={resetAllFilters}
                className="w-full py-2 rounded-xl text-xs font-semibold text-muted-fg border border-border hover:bg-muted/40 transition-colors"
              >
                전체 필터 초기화
              </button>
            )}
          </div>
        </aside>

        {/* ── 회원 목록 ── */}
        <div className="flex-1 min-w-0">
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-5 bg-card rounded-2xl border border-border animate-pulse">
                  <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-gray-200 rounded" />
                    <div className="h-3 w-2/3 bg-gray-200 rounded" />
                    <div className="h-3 w-1/4 bg-gray-200 rounded" />
                  </div>
                  <div className="w-16 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
                </div>
              ))
            ) : paged.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-fg">조건에 맞는 회원이 없습니다.</div>
            ) : (
              paged.map((u) => {
                const st = statusLabel(u.status);
                const expired = u.expiresAt && new Date(u.expiresAt) < new Date();
                const ms = matchMap.get(u.id);
                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-4 p-5 bg-card rounded-2xl border border-border hover:shadow-md transition-all cursor-pointer ${expired ? "border-danger/30 bg-danger/5" : ""}`}
                    onClick={() => {
                      try { sessionStorage.setItem("admin_scroll_y", String(window.scrollY)); } catch {}
                      router.push(`/admin/${u.id}`);
                    }}
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      {u.photoUrls[0] ? (
                        <img src={u.photoUrls[0]} alt={u.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary/20">{u.nickname?.[0]}</div>
                      )}
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
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${u.role === "male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                          {u.role === "male" ? "남성" : "여성"}
                        </span>
                        {ms && ms.total > 0 && (
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ms.approved > 0 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                            매칭 {ms.total}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-fg mt-1 truncate">
                        {u.birthYear}년생 · {u.height}cm · {regionLabel(u.city, u.district)} · {u.workplace} · {u.mbti}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {u.expiresAt && (
                          <p className={`text-xs ${expired ? "text-danger font-semibold" : "text-muted-fg"}`}>
                            만료: {new Date(u.expiresAt).toLocaleDateString("ko-KR")}
                          </p>
                        )}
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
                          <button onClick={() => handleApprove(u.id)} className="px-4 py-2 bg-success text-white text-sm font-semibold rounded-lg hover:bg-success/80 transition-colors whitespace-nowrap">승인</button>
                          <button onClick={() => openRejectModal(u)} className="px-4 py-2 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-danger/80 transition-colors whitespace-nowrap">반려</button>
                        </>
                      )}
                      {u.status === "active" && (
                        <button onClick={() => handleBlock(u.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-muted text-muted-fg hover:bg-danger/10 hover:text-danger transition-colors whitespace-nowrap">차단</button>
                      )}
                      {u.status === "blocked" && (
                        <button onClick={() => handleUnblock(u.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-muted text-muted-fg hover:bg-success/10 hover:text-success transition-colors whitespace-nowrap">해제</button>
                      )}
                      {u.status === "rejected" && (
                        <button onClick={() => handleUnreject(u.id)} className="px-4 py-2 text-sm font-semibold rounded-lg border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 transition-colors whitespace-nowrap">반려 취소</button>
                      )}
                    </div>
                  </div>
                );
              })
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
        </div>
        </div>
      </div>

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

      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes filterDropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-scaleIn { animation: scaleIn 0.18s ease-out; }
        .animate-filterDropIn { animation: filterDropIn 0.15s ease-out; }
      `}</style>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];
  const isActive = value !== "";

  const updateMenuPos = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    const onReposition = () => updateMenuPos();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const dropdown =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 200 }}
            className="py-1.5 rounded-xl border border-border bg-white shadow-lg shadow-black/10 overflow-hidden animate-filterDropIn"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value || "__all"} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left transition-colors ${
                      isSelected
                        ? "bg-[#ff8a3d]/10 text-[#ff8a3d] font-semibold"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => {
            if (!v) updateMenuPos();
            return !v;
          });
        }}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
          open
            ? "border-[#ff8a3d]/50 bg-[#ff8a3d]/5 ring-2 ring-[#ff8a3d]/20"
            : isActive
              ? "border-[#ff8a3d]/30 bg-[#ff8a3d]/8 text-[#ff8a3d]"
              : "border-border bg-[#fafafa] text-foreground hover:border-[#ff8a3d]/25 hover:bg-white"
        }`}
      >
        <span className="flex flex-col items-start min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-fg/80 leading-none mb-0.5">{label}</span>
          <span className="truncate">{selected.label}</span>
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-muted-fg transition-transform ${open ? "rotate-180 text-[#ff8a3d]" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
