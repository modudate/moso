"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, MatchRequest, MdRecommendation } from "@/lib/types";
import { regionLabel } from "@/lib/options";
import LogoutButton from "@/components/LogoutButton";
import { isPreviewMode } from "@/lib/preview";

const SCROLL_KEY = "male_scroll";

type FemaleCard = {
  user: User;
  matchId: string;
  status: string;
  source: "match" | "md";
  requestedAt: string;
};

export default function MalePage() {
  const router = useRouter();
  const [cards, setCards] = useState<FemaleCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      setTimeout(() => window.scrollTo(0, parseInt(saved)), 100);
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    const meRes = await fetch("/api/me");
    const { user } = await meRes.json();
    const uid = user?.id ?? "m-001";
    const preview = isPreviewMode();

    const [matchRes, femalesRes] = await Promise.all([
      fetch(`/api/match?maleId=${encodeURIComponent(uid)}`),
      fetch("/api/profiles?role=female&status=active"),
    ]);
    const { matches, mdRecs }: { matches: MatchRequest[]; mdRecs: MdRecommendation[] } = await matchRes.json();
    const females: User[] = await femalesRes.json();
    const femaleMap = new Map(females.map(f => [f.id, f]));

    const result: FemaleCard[] = [];
    for (const m of matches) {
      const user = femaleMap.get(m.femaleProfileId);
      if (user) result.push({ user, matchId: m.id, status: m.status, source: "match", requestedAt: m.requestedAt });
    }
    for (const md of mdRecs) {
      const user = femaleMap.get(md.femaleProfileId);
      if (user) result.push({ user, matchId: md.id, status: md.status, source: "md", requestedAt: md.createdAt });
    }

    // 피드백용 미리보기 - 매칭/MD 추천에 잡히지 않은 나머지 활성 여성도 모두 노출.
    // matchId 는 비워서 상세에서 확정/거절 버튼이 뜨지 않도록 함.
    if (preview) {
      const alreadyIds = new Set(result.map(r => r.user.id));
      for (const f of females) {
        if (!alreadyIds.has(f.id)) {
          result.push({
            user: f,
            matchId: "",
            status: "preview",
            source: "match",
            requestedAt: f.createdAt,
          });
        }
      }
    }
    result.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    setCards(result);
    setLoading(false);
  };

  const handleCardClick = (id: string, matchId: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    router.push(`/male/${id}?matchId=${matchId}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-background mx-auto max-w-[430px]">
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">모두의 모임</h1>
          <LogoutButton />
        </div>
      </header>

      <div className="px-4">
        {cards.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3 py-6">
            {cards.map((c) => (
              <div key={c.matchId || c.user.id} onClick={() => handleCardClick(c.user.id, c.matchId)}
                className={`group rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative ${c.status === "rejected" ? "opacity-60" : ""}`}>
                <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                  {c.user.photoUrls[0] ? <img src={c.user.photoUrls[0]} alt={c.user.nickname} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> :
                    <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-primary/20">{c.user.nickname?.[0]}</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {c.source === "md" && <span className="text-[10px] font-bold text-white bg-accent px-2 py-1 rounded-lg shadow-md">MD 추천</span>}
                    {c.status === "pending" && <span className="text-[10px] font-bold text-white bg-warning px-2 py-1 rounded-lg shadow-md">대기중</span>}
                    {c.status === "approved" && <span className="text-[10px] font-bold text-white bg-success px-2 py-1 rounded-lg shadow-md">매칭 확정</span>}
                    {c.status === "rejected" && <span className="text-[10px] font-bold text-white bg-muted-fg px-2 py-1 rounded-lg shadow-md">거절됨</span>}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
                    <h3 className="text-white font-bold text-base drop-shadow-lg">{c.user.nickname}</h3>
                    <p className="text-white/90 text-xs drop-shadow-md">{c.user.birthYear}년생 · {c.user.height}cm</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium rounded-full">{regionLabel(c.user.city, c.user.district)}</span>
                      <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium rounded-full">{c.user.workplace}</span>
                      <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium rounded-full">{c.user.mbti}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
