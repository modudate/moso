"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, MatchRequest, MdRecommendation } from "@/lib/types";
import { regionLabel } from "@/lib/options";
import Sidebar from "@/components/Sidebar";
import ProfileCardSkeleton from "@/components/ProfileCardSkeleton";
import GridToggle from "@/components/GridToggle";

const SCROLL_KEY = "male_scroll";
const PAGE_SIZE = 10;

// 한 여성에 대한 카드.
//   같은 (남,여) 쌍에 대해 매칭요청(match) 과 MD 추천이 모두 있을 수 있음.
//   - 화면에는 한 카드로만 보여주되, 두 출처 뱃지(MD 추천 / 관심도착)를 모두 표시
//   - 응답(수락/거절)은 "여성이 직접 선택" 우선이므로 source 우선순위는 match > md
//     (PATCH /api/match 호출 시 source 결정 + matchId 어디 row 를 가리킬지)
type FemaleCard = {
  user: User;
  matchId: string;            // 우선순위 source 의 row id (응답 PATCH 대상)
  status: string;             // 우선순위 source 의 status (대기/수락/거절)
  source: "match" | "md";     // 우선순위 source ("match" 가 우선)
  requestedAt: string;        // 정렬용 — 더 이른 시점 (먼저 들어온 행위 기준)
  hasMatch: boolean;          // 여성의 직접 매칭요청이 있는가
  hasMd: boolean;             // 관리자의 MD 추천이 있는가
};

export default function MalePage() {
  const router = useRouter();
  const [cards, setCards] = useState<FemaleCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [gridCols, setGridCols] = useState<1 | 2>(2);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible((v) => Math.min(v + PAGE_SIZE, cards.length));
      }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, cards.length]);

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      setTimeout(() => window.scrollTo(0, parseInt(saved)), 100);
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);

    // 프로필 리스트는 내 ID 에 의존하지 않으므로 /api/me 와 동시에 바로 출발
    const femalesPromise = fetch("/api/profiles?role=female&status=active");
    const meRes = await fetch("/api/me");
    const { user } = await meRes.json();
    const uid = user?.id;

    if (!uid) {
      setCards([]);
      setLoading(false);
      return;
    }

    const [matchRes, femalesRes] = await Promise.all([
      fetch(`/api/match?maleId=${encodeURIComponent(uid)}`),
      femalesPromise,
    ]);
    const { matches, mdRecs }: { matches: MatchRequest[]; mdRecs: MdRecommendation[] } = await matchRes.json();
    const females: User[] = await femalesRes.json();
    const femaleMap = new Map(females.map(f => [f.id, f]));

    // 같은 femaleId 에 대해 match + md 가 모두 있을 수 있음.
    // 정책 (2026-05-15 확정):
    //   · 카드는 femaleId 별 1개로 합치기 (중복 카드 노출 금지)
    //   · 두 출처 뱃지(MD 추천 + 관심도착) 모두 표시
    //   · 우선순위는 "여성이 직접 선택" 이 우선 → match 가 있으면 그 row 를 응답 대상으로
    const merged = new Map<string, FemaleCard>();

    const upsert = (
      femaleId: string,
      base: { matchId: string; status: string; source: "match" | "md"; requestedAt: string },
    ) => {
      const user = femaleMap.get(femaleId);
      if (!user) return;
      const existing = merged.get(femaleId);
      if (!existing) {
        merged.set(femaleId, {
          user,
          matchId: base.matchId,
          status: base.status,
          source: base.source,
          requestedAt: base.requestedAt,
          hasMatch: base.source === "match",
          hasMd: base.source === "md",
        });
        return;
      }
      // 합치기 — 더 이른 requestedAt 으로 정렬, 우선순위 source = match
      const earlier =
        new Date(base.requestedAt).getTime() < new Date(existing.requestedAt).getTime()
          ? base.requestedAt
          : existing.requestedAt;
      const preferMatch = existing.source === "match" || base.source === "match";
      const winner =
        preferMatch && base.source === "match"
          ? base
          : preferMatch && existing.source === "match"
          ? { matchId: existing.matchId, status: existing.status, source: existing.source, requestedAt: existing.requestedAt }
          : existing;
      merged.set(femaleId, {
        user,
        matchId: winner.matchId,
        status: winner.status,
        source: winner.source as "match" | "md",
        requestedAt: earlier,
        hasMatch: existing.hasMatch || base.source === "match",
        hasMd: existing.hasMd || base.source === "md",
      });
    };

    for (const m of matches) {
      upsert(m.femaleProfileId, { matchId: m.id, status: m.status, source: "match", requestedAt: m.requestedAt });
    }
    for (const md of mdRecs) {
      upsert(md.femaleProfileId, { matchId: md.id, status: md.status, source: "md", requestedAt: md.createdAt });
    }

    const result = Array.from(merged.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
    setCards(result);
    setLoading(false);
  };

  const handleCardClick = (id: string, matchId: string, source: "match" | "md") => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    router.push(`/male/${id}?matchId=${matchId}&source=${source}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background mx-auto max-w-[430px]">
        <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
          <div className="px-4 py-4 flex items-center justify-between">
            <img src="/header_logo.png" alt="모두의 소개팅 MOSO" className="h-8 w-auto" />
            <div className="w-9 h-9 rounded-lg bg-white/20" />
          </div>
        </header>
        <div className="px-4">
          <ProfileCardSkeleton count={6} />
        </div>
      </main>
    );
  }

  const paged = cards.slice(0, visible);

  return (
    <main className="min-h-screen bg-background mx-auto max-w-[430px]">
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="px-4 py-4 flex items-center justify-between">
          <img src="/header_logo.png" alt="모두의 소개팅 MOSO" className="h-8 w-auto" />
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
      </header>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} gender="male" />

      <div className="px-4">
        {cards.length > 0 && (
          <div className="py-3 flex items-center">
            <span className="text-sm text-muted-fg">{cards.length}명</span>
            <div className="ml-auto">
              <GridToggle cols={gridCols} onChange={setGridCols} />
            </div>
          </div>
        )}
        {cards.length === 0 ? (
          <EmptyState />
        ) : (
          <div className={`grid ${gridCols === 1 ? "grid-cols-1" : "grid-cols-2"} gap-3 pb-6`}>
            {paged.map((c) => {
              const big = gridCols === 1;
              const badgeCls = `${big ? "text-xs px-2.5 py-1.5" : "text-[10px] px-2 py-1"} font-bold text-white rounded-lg shadow-md`;
              const chipCls = `${big ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]"} bg-white/20 backdrop-blur-sm text-white font-medium rounded-full`;
              return (
              <div key={c.matchId || c.user.id} onClick={() => handleCardClick(c.user.id, c.matchId, c.source)}
                className={`group rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative ${c.status === "rejected" ? "opacity-60" : ""}`}>
                <div className="relative aspect-[9/16] bg-muted overflow-hidden">
                  {c.user.photoUrls[0] ? <img src={c.user.photoUrls[0]} alt={c.user.nickname} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> :
                    <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-primary/20">{c.user.nickname?.[0]}</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className={`absolute ${big ? "top-4 left-4 gap-2" : "top-3 left-3 gap-1.5"} flex flex-wrap`}>
                    {/* 출처 뱃지 — 두 출처 모두 있으면 둘 다 표시 (정책: 합치되 양쪽 노출) */}
                    {c.hasMd && <span className={`${badgeCls} bg-accent`}>MD 추천</span>}
                    {/* 상태 뱃지 */}
                    {c.status === "pending" && <span className={`${badgeCls} bg-warning`}>관심도착</span>}
                    {c.status === "approved" && <span className={`${badgeCls} bg-success`}>매칭요청 보냄</span>}
                    {c.status === "rejected" && <span className={`${badgeCls} bg-muted-fg`}>거절됨</span>}
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 ${big ? "p-5 space-y-2.5" : "p-3 space-y-1.5"}`}>
                    <h3 className={`text-white font-bold drop-shadow-lg ${big ? "text-2xl" : "text-base"}`}>{c.user.nickname}</h3>
                    <p className={`text-white/90 drop-shadow-md ${big ? "text-base" : "text-xs"}`}>{c.user.birthYear}년생 · {c.user.height}cm</p>
                    <div className={`flex flex-wrap ${big ? "gap-1.5" : "gap-1"}`}>
                      <span className={chipCls}>{regionLabel(c.user.city, c.user.district)}</span>
                      <span className={chipCls}>{c.user.workplace}</span>
                      <span className={chipCls}>{c.user.mbti}</span>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {visible < cards.length && (
          <>
            <ProfileCardSkeleton count={4} />
            <div ref={sentinelRef} className="h-1" />
          </>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  const tips = [
    "지금 이 순간에도 여성 회원분들이 프로필을 열심히 살펴보고 계세요!",
    "좋은 인연은 조금 기다려야 더 빛나는 법이에요.",
    "프로필 사진을 업데이트하면 선택받을 확률이 3배 높아진다는 사실, 알고 계셨나요?",
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-28 h-28 bg-gradient-to-br from-primary-light to-accent/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <svg className="w-14 h-14 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-3">아직 들어온 매칭 요청이 없어요</h2>
      <p className="text-muted-fg text-base max-w-md mb-4">
        걱정 마세요! 많은 여성 회원분들이 매일 새로운 프로필을 확인하고 있습니다.
      </p>
      <div className="bg-primary-light/50 rounded-2xl px-6 py-4 max-w-md">
        <p className="text-sm text-primary-dark font-medium">{randomTip}</p>
      </div>
      <p className="text-xs text-muted-fg/60 mt-8">여성 회원이 회원님을 선택하면 여기에 프로필이 표시됩니다</p>
    </div>
  );
}
