"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, MatchRequest } from "@/lib/types";
import { regionLabel } from "@/lib/options";

export default function MatchRequestListPage() {
  const router = useRouter();
  const [cartUsers, setCartUsers] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<(MatchRequest & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [femaleId, setFemaleId] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const meRes = await fetch("/api/me", { cache: "no-store" });
    const { user } = await meRes.json();
    const uid: string | null = user?.id ?? null;
    const status: string | null = user?.status ?? null;
    setFemaleId(uid);
    setMyStatus(status);

    const malesPromise = fetch("/api/profiles?role=male&status=active");

    if (uid && status === "active") {
      const [cartRes, malesRes, sentRes] = await Promise.all([
        fetch(`/api/cart?femaleId=${encodeURIComponent(uid)}`),
        malesPromise,
        fetch(`/api/match?femaleId=${encodeURIComponent(uid)}`),
      ]);
      const cartData: { maleProfileId: string }[] = await cartRes.json();
      const males: User[] = await malesRes.json();
      const maleMap = new Map(males.map(m => [m.id, m]));
      const ids = new Set(cartData.map(c => c.maleProfileId));
      setCartUsers(males.filter(m => ids.has(m.id)));

      const sentData: MatchRequest[] = await sentRes.json();
      setSentRequests(sentData.map(s => ({ ...s, user: maleMap.get(s.maleProfileId) })));
    } else {
      // 비로그인/가입 미완료 → 빈 화면 (정상 흐름이면 미들웨어가 차단)
      setCartUsers([]);
      setSentRequests([]);
    }
    setLoading(false);
  };

  const guardActive = (): boolean => {
    if (femaleId && myStatus === "active") return true;
    if (myStatus === "pending") alert("아직 가입 승인 대기 중입니다.\n관리자 승인 후 이용 가능합니다.");
    else if (myStatus === "rejected") alert("가입이 반려된 계정입니다. 관리자에게 문의해주세요.");
    else if (myStatus === "blocked") alert("이용이 제한된 계정입니다. 관리자에게 문의해주세요.");
    else alert("로그인이 필요합니다.");
    return false;
  };

  const removeFromList = async (maleId: string) => {
    if (!guardActive()) return;
    const prevUsers = cartUsers;
    setCartUsers(prev => prev.filter(u => u.id !== maleId)); // 낙관적
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ femaleProfileId: femaleId, maleProfileId: maleId }),
        keepalive: true,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `요청 실패 (${res.status})`);
      }
    } catch (err) {
      setCartUsers(prevUsers); // 롤백
      alert(`매칭 후보 제거에 실패했습니다.\n${err instanceof Error ? err.message : ""}`);
    }
  };

  const handleConfirm = async () => {
    if (cartUsers.length === 0) return;
    if (!guardActive()) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ femaleProfileId: femaleId, maleProfileIds: cartUsers.map(u => u.id) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `요청 실패 (${res.status})`);
      }
      const data: { created?: string[]; blocked?: { maleId: string; reason: string }[] } = await res.json();
      const blockedCount = data.blocked?.length ?? 0;
      const createdCount = data.created?.length ?? 0;
      if (createdCount === 0 && blockedCount > 0) {
        alert("선택한 상대는 모두 이미 매칭 이력이 있어 요청을 보낼 수 없습니다.");
      } else if (blockedCount > 0) {
        alert(`${createdCount}명에게 매칭요청을 보냈습니다.\n${blockedCount}명은 이미 매칭 이력이 있어 제외되었습니다.`);
      }
      setDone(true);
    } catch (err) {
      alert(`매칭 요청 전송에 실패했습니다.\n${err instanceof Error ? err.message : ""}`);
    } finally {
      setConfirming(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white px-4">
        <div className="bg-card rounded-3xl shadow-xl p-10 text-center space-y-6 max-w-md w-full">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold">매칭 요청이 전달되었습니다!</h2>
          <p className="text-muted-fg">상대방이 수락하면 매칭이 완료됩니다.</p>
          <button onClick={() => router.push("/female")} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-background pb-64 mx-auto max-w-[430px]">
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/female")} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold flex-1 text-white">매칭 후보 ({cartUsers.length}명)</h1>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* 상단 영역 - 매칭 요청 보내기 */}
        {cartUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-fg">
            <p className="text-lg">매칭 후보가 비어있습니다</p>
            <p className="text-sm mt-2">마음에 드는 프로필에 하트를 눌러 추가해주세요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cartUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/female/${u.id}`)}>
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {u.photoUrls[0] ? <img src={u.photoUrls[0]} alt={u.nickname} className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary/20">{u.nickname?.[0]}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">{u.nickname}</h3>
                  <p className="text-sm text-muted-fg mt-0.5">{u.birthYear}년생 · {u.height}cm · {regionLabel(u.city, u.district)}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{u.workplace}</span>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{u.mbti}</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeFromList(u.id); }} className="text-muted-fg hover:text-danger transition-colors p-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}

            <div className="pt-4">
              <button onClick={handleConfirm} disabled={confirming}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-dark transition-colors disabled:opacity-40 shadow-lg">
                {confirming ? "처리 중..." : `${cartUsers.length}명에게 매칭 요청 보내기`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 고정 영역 - 매칭 요청 보낸 남성 목록 */}
      {sentRequests.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t-2 border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40">
          <div
            className="px-4 pt-4"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2rem)" }}
          >
            <h3 className="text-sm font-bold text-muted-fg mb-3">매칭 요청 보낸 남성 ({sentRequests.length}명)</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {sentRequests.map((s) => s.user && (
                <div key={s.id} className="flex-shrink-0 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                    {s.user.photoUrls[0] ? <img src={s.user.photoUrls[0]} alt={s.user.nickname} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary/20">{s.user.nickname?.[0]}</div>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{s.user.nickname}</p>
                    <p className="text-[10px] text-muted-fg">{new Date(s.requestedAt).toLocaleDateString("ko-KR")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
