"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, MatchRequest } from "@/lib/types";
import { regionLabel } from "@/lib/options";

export default function MalePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<(MatchRequest & { fromUser?: User })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("ourmo_user");
    if (!stored) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    if (u.gender !== "남자") { router.push("/female"); return; }
    setCurrentUser(u);
    fetchData(u.id);
  }, [router]);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    const [matchRes, femalesRes] = await Promise.all([
      fetch(`/api/match?toUserId=${userId}`),
      fetch("/api/profiles?gender=여자&status=approved"),
    ]);
    const matchData: MatchRequest[] = await matchRes.json();
    const females: User[] = await femalesRes.json();
    const femaleMap = new Map(females.map(f => [f.id, f]));
    const enriched = matchData.map(m => ({ ...m, fromUser: femaleMap.get(m.fromUserId) }));
    setMatches(enriched);
    setLoading(false);
  }, []);

  const handleAction = async (matchId: string, action: "accepted" | "rejected") => {
    await fetch("/api/match", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action }),
    });
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, action } : m));
  };

  if (loading || !currentUser) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const pendingMatches = matches.filter(m => m.action === "pending");
  const acceptedMatches = matches.filter(m => m.action === "accepted");
  const rejectedMatches = matches.filter(m => m.action === "rejected");

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">OUR<span className="text-primary">MO</span></h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-fg">{currentUser.name}님</span>
            <button onClick={() => { localStorage.removeItem("ourmo_user"); router.push("/login"); }} className="text-xs text-muted-fg hover:text-foreground">로그아웃</button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {matches.length === 0 ? (
          <div className="text-center py-20 text-muted-fg">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-muted-fg/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </div>
            <p className="text-lg font-medium">아직 들어온 요청이 없습니다</p>
            <p className="text-sm mt-2">여성 회원이 회원님을 선택하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <>
            {/* Pending */}
            {pendingMatches.length > 0 && (
              <Section title="대기 중인 요청" count={pendingMatches.length}>
                {pendingMatches.map(m => m.fromUser && (
                  <MatchCard key={m.id} user={m.fromUser} match={m} onAction={handleAction} />
                ))}
              </Section>
            )}
            {/* Accepted */}
            {acceptedMatches.length > 0 && (
              <Section title="수락한 매칭" count={acceptedMatches.length} color="success">
                {acceptedMatches.map(m => m.fromUser && (
                  <MatchCard key={m.id} user={m.fromUser} match={m} onAction={handleAction} />
                ))}
              </Section>
            )}
            {/* Rejected */}
            {rejectedMatches.length > 0 && (
              <Section title="거절한 요청" count={rejectedMatches.length} color="muted">
                {rejectedMatches.map(m => m.fromUser && (
                  <MatchCard key={m.id} user={m.fromUser} match={m} onAction={handleAction} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Section({ title, count, color = "primary", children }: { title: string; count: number; color?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color === "success" ? "bg-success/10 text-success" : color === "muted" ? "bg-muted text-muted-fg" : "bg-primary/10 text-primary"}`}>{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function MatchCard({ user, match, onAction }: { user: User; match: MatchRequest & { fromUser?: User }; onAction: (id: string, action: "accepted" | "rejected") => void }) {
  return (
    <div className={`flex items-center gap-4 bg-card rounded-2xl border border-border p-4 transition-all ${match.action === "rejected" ? "opacity-50" : "hover:shadow-md"}`}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
        {user.imageUrl ? <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" /> :
          <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary/20">{user.name?.[0]}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold">{user.name}</h3>
        <p className="text-sm text-muted-fg">{user.birthYear} · {user.height}cm · {regionLabel(user.city, user.district)}</p>
        <div className="flex gap-1.5 mt-1.5">
          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{user.education}</span>
          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{user.mbti}</span>
        </div>
      </div>
      {match.action === "pending" && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={() => onAction(match.id, "accepted")} className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors">수락</button>
          <button onClick={() => onAction(match.id, "rejected")} className="px-4 py-2 bg-muted text-muted-fg text-sm font-semibold rounded-xl hover:bg-danger/10 hover:text-danger transition-colors">거절</button>
        </div>
      )}
      {match.action === "accepted" && (
        <span className="px-3 py-1.5 bg-success/10 text-success text-sm font-semibold rounded-xl">수락됨</span>
      )}
      {match.action === "rejected" && (
        <span className="px-3 py-1.5 bg-muted text-muted-fg text-sm font-semibold rounded-xl">거절됨</span>
      )}
    </div>
  );
}
