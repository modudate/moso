"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@/lib/types";
import { regionLabel, FILTER_ITEMS, JOBS } from "@/lib/options";
import Sidebar from "@/components/Sidebar";
import ProfileCardSkeleton from "@/components/ProfileCardSkeleton";
import GridToggle from "@/components/GridToggle";
import {
  type MultiFilters, activeCount, toggleFilterValue, setFilterAll, clearFilterKey,
  matchInfoFilters,
} from "@/lib/filter";

const PAGE_SIZE = 10;
const SCROLL_KEY = "female_scroll";

export default function FemalePage() {
  const router = useRouter();
  const [males, setMales] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<MultiFilters>({});
  const [tempFilters, setTempFilters] = useState<MultiFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [gridCols, setGridCols] = useState<1 | 2>(2);
  const [myId, setMyId] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterJobRef = useRef<HTMLDivElement | null>(null);

  // 직장이 정확히 1개 선택되었을 때만 직업 하위 필터를 노출 (다중 선택과 호환되는 보수적 정책)
  const singleSelectedWorkplace = (tempFilters.workplace && tempFilters.workplace.length === 1)
    ? tempFilters.workplace[0]
    : null;

  useEffect(() => {
    if (showFilters && singleSelectedWorkplace && filterJobRef.current) {
      filterJobRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [singleSelectedWorkplace, showFilters]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved && scrollRef.current) {
      setTimeout(() => window.scrollTo(0, parseInt(saved)), 100);
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    // 남성 리스트는 내 ID 에 의존하지 않으므로 /api/me 와 동시에 바로 출발
    const malesPromise = fetch("/api/profiles?role=male&status=active");
    const meRes = await fetch("/api/me", { cache: "no-store" });
    const { user } = await meRes.json();
    const uid: string | null = user?.id ?? null;
    const status: string | null = user?.status ?? null;
    setMyId(uid);
    setMyStatus(status);

    // active 회원만 cart 조회 (그 외엔 빈 cart)
    const fetches: [Promise<Response>, Promise<Response> | null] = [
      malesPromise,
      uid && status === "active"
        ? fetch(`/api/cart?femaleId=${encodeURIComponent(uid)}`)
        : null,
    ];
    const [mRes, cRes] = await Promise.all(fetches);
    const mData = await mRes.json();
    setMales(mData);
    if (cRes) {
      const cData = await cRes.json();
      setCart(new Set(cData.map((c: { maleProfileId: string }) => c.maleProfileId)));
    } else {
      setCart(new Set());
    }
    setLoading(false);
  };

  const toggleCart = async (e: React.MouseEvent, maleId: string) => {
    e.stopPropagation();
    // 미리보기/비로그인/가입 미완료 상태에서는 cart 기능 차단 (UUID FK 에러 방지)
    if (!myId || myStatus !== "active") {
      if (!myId) {
        alert(
          "정식 로그인 후 이용 가능한 기능입니다.\n홈 화면에서 'Google 계정으로 계속하기'로 로그인 후 다시 시도해주세요.",
        );
      } else if (myStatus === "pending") {
        alert("아직 가입 승인 대기 중입니다.\n관리자 승인 후 이용 가능합니다.");
      } else if (myStatus === "rejected") {
        alert("가입이 반려된 계정입니다. 관리자에게 문의해주세요.");
      } else if (myStatus === "blocked") {
        alert("이용이 제한된 계정입니다. 관리자에게 문의해주세요.");
      } else {
        alert("회원가입이 완료되지 않았습니다.\n홈 화면에서 가입을 먼저 진행해주세요.");
      }
      return;
    }
    const wasInCart = cart.has(maleId);
    // 낙관적 업데이트
    setCart(prev => {
      const n = new Set(prev);
      if (wasInCart) n.delete(maleId); else n.add(maleId);
      return n;
    });
    try {
      const res = await fetch("/api/cart", {
        method: wasInCart ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ femaleProfileId: myId, maleProfileId: maleId }),
        keepalive: true,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `요청 실패 (${res.status})`);
      }
    } catch (err) {
      // 실패 시 롤백
      setCart(prev => {
        const n = new Set(prev);
        if (wasInCart) n.add(maleId); else n.delete(maleId);
        return n;
      });
      alert(`매칭 후보 ${wasInCart ? "제거" : "추가"}에 실패했습니다.\n${err instanceof Error ? err.message : ""}`);
    }
  };

  const handleCardClick = (id: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    router.push(`/female/${id}`);
  };

  const openFilters = () => {
    setTempFilters({ ...filters });
    setShowFilters(true);
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setVisible(PAGE_SIZE);
    setShowFilters(false);
  };

  const resetTempFilters = () => {
    setTempFilters({});
  };

  const matchFilter = (m: User) => matchInfoFilters(m, filters);

  const activeFilterCount = activeCount(filters);
  const tempActiveCount = activeCount(tempFilters);
  const filtered = males.filter(matchFilter);
  const paged = filtered.slice(0, visible);

  useEffect(() => {
    if (loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length));
      }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, filtered.length]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background mx-auto max-w-[430px]">
        <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
          <div className="px-4 py-4 flex items-center justify-between">
            <img src="/header_logo.png" alt="모두의 소개팅 MOSO" className="h-8 w-auto" />
            <div className="flex items-center gap-3">
              <div className="w-28 h-8 rounded-lg bg-white/20" />
              <div className="w-9 h-9 rounded-lg bg-white/20" />
            </div>
          </div>
        </header>
        <div className="px-4">
          <ProfileCardSkeleton count={6} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background mx-auto max-w-[430px]" ref={scrollRef}>
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="px-4 py-4 flex items-center justify-between">
          <img src="/header_logo.png" alt="모두의 소개팅 MOSO" className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            <Link href="/female/cart" className="relative px-3 py-1.5 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors">
              매칭 후보 {cart.size > 0 && <span className="ml-1 bg-white text-[#ff8a3d] text-xs w-5 h-5 rounded-full inline-flex items-center justify-center font-bold">{cart.size}</span>}
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-white/15 transition-colors"
              aria-label="메뉴 열기"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} gender="female" />

      <div className="px-4">
        <div className="py-3 flex items-center gap-3">
          <span className="text-sm text-muted-fg">{filtered.length}명</span>
          <button onClick={openFilters}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${activeFilterCount > 0 ? "bg-[#ff8a3d]/10 border-[#ff8a3d]/30 text-[#ff8a3d]" : "bg-white border-border hover:border-[#ff8a3d]/30"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
            필터 {activeFilterCount > 0 && <span className="text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#ff8a3d" }}>{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && <button onClick={() => { setFilters({}); setVisible(PAGE_SIZE); }} className="text-xs text-danger hover:underline">초기화</button>}
          <div className="ml-auto">
            <GridToggle cols={gridCols} onChange={setGridCols} />
          </div>
        </div>

        <div className={`grid ${gridCols === 1 ? "grid-cols-1" : "grid-cols-2"} gap-3 pb-6`}>
          {paged.map((m) => {
            const big = gridCols === 1;
            const chipCls = `${big ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]"} bg-white/20 backdrop-blur-sm text-white font-medium rounded-full`;
            return (
            <div key={m.id} onClick={() => handleCardClick(m.id)} className="group rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative cursor-pointer">
              <div className="relative aspect-[9/16] bg-muted overflow-hidden">
                {m.photoUrls[0] ? <img src={m.photoUrls[0]} alt={m.nickname} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> :
                  <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-primary/20">{m.nickname?.[0]}</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className={`absolute bottom-0 left-0 right-0 ${big ? "p-5 space-y-2.5" : "p-3 space-y-1.5"}`}>
                  <h3 className={`text-white font-bold drop-shadow-lg ${big ? "text-2xl" : "text-base"}`}>{m.nickname}</h3>
                  <p className={`text-white/90 drop-shadow-md ${big ? "text-base" : "text-xs"}`}>{m.birthYear}년생 · {m.height}cm</p>
                  <div className={`flex flex-wrap ${big ? "gap-1.5" : "gap-1"}`}>
                    <span className={chipCls}>{regionLabel(m.city, m.district)}</span>
                    <span className={chipCls}>{m.workplace}</span>
                    <span className={chipCls}>{m.mbti}</span>
                  </div>
                </div>
                <button onClick={(e) => toggleCart(e, m.id)}
                  className={`absolute ${big ? "top-4 right-4 w-12 h-12" : "top-3 right-3 w-9 h-9"} rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-md z-10`}>
                  {cart.has(m.id) ? (
                    <svg className={`${big ? "w-6 h-6" : "w-5 h-5"} text-[#ff8a3d]`} fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                  ) : (
                    <svg className={`${big ? "w-6 h-6" : "w-5 h-5"} text-muted-fg`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  )}
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {paged.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-muted-fg">조건에 맞는 회원이 없어요</p>
            <p className="text-sm text-muted-fg/70 mt-1">필터 조건을 변경해보세요</p>
          </div>
        )}

        {visible < filtered.length && (
          <>
            <ProfileCardSkeleton count={4} />
            <div ref={sentinelRef} className="h-1" />
          </>
        )}
      </div>

      {/* 필터 모달 (바텀시트) */}
      {showFilters && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60] transition-opacity" onClick={() => setShowFilters(false)} />
          <div className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-[430px] z-[70] bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] animate-slideUp">
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <button onClick={resetTempFilters} className="text-sm text-muted-fg hover:text-foreground transition-colors">
                초기화
              </button>
              <h3 className="text-base font-bold">필터</h3>
              <button onClick={() => setShowFilters(false)} className="text-muted-fg hover:text-foreground transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 필터 항목들 */}
            <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {FILTER_ITEMS.map(fo => {
                const selected = tempFilters[fo.key] ?? [];
                const allSelected = selected.length === fo.options.length && fo.options.length > 0;
                return (
                  <div key={fo.key}>
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      {fo.label} {selected.length > 0 && <span className="text-xs text-[#ff8a3d]">· {selected.length}개</span>}
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setTempFilters((p) => setFilterAll(p, fo.key, fo.options))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          allSelected ? "text-white border-transparent" : "bg-white text-foreground border-border"
                        }`}
                        style={allSelected ? { backgroundColor: "#ff8a3d" } : {}}
                      >
                        전체 선택
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempFilters((p) => {
                          const n = clearFilterKey(p, fo.key);
                          if (fo.key === "workplace") return clearFilterKey(n, "job");
                          return n;
                        })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-muted-fg border border-border"
                      >
                        무관 (전체 보기)
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fo.options.map((o) => {
                        const isOn = selected.includes(o);
                        return (
                          <button
                            key={o}
                            onClick={() => setTempFilters((p) => {
                              const n = toggleFilterValue(p, fo.key, o);
                              // 직장 다중선택이 바뀌면 직업 sub-filter 는 초기화 (단일 직장 선택 시에만 사용)
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
                      <div ref={filterJobRef} className="mt-3 pl-3 border-l-2 border-[#ff8a3d]/30 scroll-mt-4">
                        <label className="text-xs font-semibold text-muted-fg mb-2 block">└ 직업 (직장 1개 선택 시)</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setTempFilters((p) => clearFilterKey(p, "job"))}
                            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                              !tempFilters.job || tempFilters.job.length === 0 ? "text-white border-transparent" : "bg-white border-border text-muted-fg hover:border-gray-400"
                            }`}
                            style={!tempFilters.job || tempFilters.job.length === 0 ? { backgroundColor: "#ff8a3d" } : {}}
                          >
                            전체
                          </button>
                          {JOBS[singleSelectedWorkplace].map((j) => {
                            const isOn = (tempFilters.job ?? []).includes(j);
                            return (
                              <button
                                key={j}
                                onClick={() => setTempFilters((p) => toggleFilterValue(p, "job", j))}
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

            {/* 하단 버튼 */}
            <div className="px-5 py-4 border-t border-border">
              <button onClick={applyFilters}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90"
                style={{ backgroundColor: "#ff8a3d" }}>
                {tempActiveCount > 0 ? `필터 적용하기 (${tempActiveCount}개)` : "전체 보기"}
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
