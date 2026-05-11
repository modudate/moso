"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { User, MatchRequest, MdRecommendation } from "@/lib/types";
import { regionLabel, smokingLabel } from "@/lib/options";
import PhotoCarousel from "@/components/PhotoCarousel";
import { isPreviewMode } from "@/lib/preview";

export default function FemaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [matchStatus, setMatchStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "info" | "error"; msg: string } | null>(null);
  const [imageZoom, setImageZoom] = useState<string | null>(null);

  const femaleId = params.id as string;
  const matchId = searchParams.get("matchId") || "";

  useEffect(() => { setPreview(isPreviewMode()); }, []);
  useEffect(() => { fetchData(); }, [femaleId]);

  // 토스트 자동 사라짐
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchData = async () => {
    setLoading(true);
    // 프로필 + 내 매칭 상태를 함께 조회.
    // 같은 여성 프로필을 다시 열었을 때도 이미 응답한 상태(approved/rejected)가 정확히 반영되도록.
    const profilePromise = fetch(`/api/profiles?role=female&status=active`);
    const mePromise = fetch(`/api/me`, { cache: "no-store" });
    const [profileRes, meRes] = await Promise.all([profilePromise, mePromise]);
    const females: User[] = await profileRes.json();
    setUser(females.find(f => f.id === femaleId) || null);

    // 매칭 상태는 현재 로그인 남성 기준으로 조회 (버그 수정: 화면 재진입 시 pending 으로 초기화되는 문제)
    try {
      const { user: me } = await meRes.json();
      const uid: string | undefined = me?.id;
      if (uid) {
        const matchRes = await fetch(`/api/match?maleId=${encodeURIComponent(uid)}`, { cache: "no-store" });
        const { matches, mdRecs }: { matches: MatchRequest[]; mdRecs: MdRecommendation[] } = await matchRes.json();
        const m = matches.find((x) => x.femaleProfileId === femaleId);
        const md = mdRecs.find((x) => x.femaleProfileId === femaleId);
        // 우선순위: 매칭요청 > MD 추천. 응답된 상태가 있으면 그대로 반영.
        const found = m ?? md;
        if (found) setMatchStatus(found.status);
        else setMatchStatus("pending");
      }
    } catch {
      // 조회 실패 시 기본값
    }

    setLoading(false);
  };

  const handleAction = async (status: "approved" | "rejected") => {
    if (submitting) return;
    // 매칭 확정(수락) 은 번복 불가이므로 동작 시점에 한번 더 안내
    const isRevert = status === "approved" && matchStatus === "rejected";
    if (status === "approved") {
      const message = isRevert
        ? "거절했던 매칭을 수락으로 번복하시겠습니까?\n\n수락 후에는 다시 거절로 되돌릴 수 없습니다."
        : "이 여성 회원에게 매칭요청을 보내시겠습니까?\n\n여성분이 수락하면 매칭이 완료됩니다.\n한 번 보낸 매칭요청은 취소할 수 없습니다.";
      const ok = window.confirm(message);
      if (!ok) return;
    }

    // 피드백용 미리보기에서는 실제 반영하지 않고 UI 상태만 변경
    if (preview || !matchId) {
      setMatchStatus(status);
      setToast({
        kind: status === "approved" ? "success" : "info",
        msg: status === "approved"
          ? "매칭요청이 전달되었습니다 (미리보기)"
          : "거절 처리되었습니다 (미리보기)",
      });
      return;
    }

    setSubmitting(status);
    try {
      const res = await fetch("/api/match", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `요청 실패 (${res.status})`);
      }
      setMatchStatus(status);
      setToast({
        kind: status === "approved" ? "success" : "info",
        msg: status === "approved"
          ? (isRevert
              ? "거절을 수락으로 번복했습니다. 매칭요청이 전달되었습니다."
              : "여성분에게 매칭요청이 전달되었습니다. 여성분이 수락 시 매칭이 완료됩니다.")
          : "거절 처리되었습니다. (7일 내 수락으로 번복할 수 있습니다)",
      });
    } catch (err) {
      setToast({
        kind: "error",
        msg: `처리 중 오류가 발생했습니다.${err instanceof Error ? `\n${err.message}` : ""}`,
      });
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted-fg">프로필을 찾을 수 없습니다</div>;

  const age = new Date().getFullYear() - user.birthYear + 1;

  return (
    <main className="min-h-screen bg-white mx-auto max-w-[430px] relative pb-32">
      {/* 헤더 */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#ff8a3d" }}>
        <button onClick={() => router.back()} className="text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-white font-bold">{user.nickname}</span>
        <div className="w-6" />
      </div>

      {/* 대표 사진 슬라이드 (최대 4장) */}
      <PhotoCarousel photos={user.photoUrls} alt={user.nickname} />

      {/* 이름 + 나이 */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-[28px] font-bold text-foreground">{user.nickname}, {age}</h1>
      </div>

      {/* 기본 정보 리스트 */}
      <div className="px-5 divide-y divide-border">
        <InfoRow icon={<IC d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />} label="직장" value={user.workplace} />
        <InfoRow icon={<IC d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />} label="직업" value={user.job} />
        <InfoRow icon={<IC d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />} label="근무패턴" value={user.workPattern} />
        <InfoRow icon={<IC d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} label="연봉" value={user.salary} />
        <InfoRow icon={<IC d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />} label="학력" value={user.education} />
        <InfoRow icon={<IC d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />} label="MBTI" value={user.mbti} />
        <InfoRow icon={<IC d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />} label="흡연" value={smokingLabel(user.smoking)} />
        <InfoRow icon={<IC d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5m4.5 4.5V4.5" />} label="키" value={`${user.height}cm`} />
        <InfoRow icon={<IC d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />} label="거주지" value={regionLabel(user.city, user.district)} />
      </div>

      {/* 저의 매력은 */}
      <div className="px-5 pt-8 pb-2">
        <h2 className="text-xl font-bold text-foreground mb-3">저의 매력은</h2>
        <p className="text-[15px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{user.charm}</p>
      </div>
      {user.charmPhoto && (
        <button
          type="button"
          onClick={() => setImageZoom(user.charmPhoto)}
          aria-label="저의 매력 사진 확대"
          className="mt-3 w-full aspect-square bg-muted block cursor-zoom-in"
        >
          <img src={user.charmPhoto} alt={`${user.nickname} 매력`} className="w-full h-full object-cover" />
        </button>
      )}

      {/* 연인이 생기면 하고 싶은 일은 */}
      <div className="px-5 pt-8 pb-2">
        <h2 className="text-xl font-bold text-foreground mb-3">연인이 생기면 하고 싶은 일은</h2>
        <p className="text-[15px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{user.datingStyle}</p>
      </div>
      {user.datePhoto && (
        <button
          type="button"
          onClick={() => setImageZoom(user.datePhoto)}
          aria-label="연인이 생기면 사진 확대"
          className="mt-3 w-full aspect-square bg-muted block cursor-zoom-in"
        >
          <img src={user.datePhoto} alt={`${user.nickname} 연인`} className="w-full h-full object-cover" />
        </button>
      )}

      {/* 사진 확대 라이트박스 */}
      {imageZoom && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImageZoom(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
            onClick={() => setImageZoom(null)}
            aria-label="닫기"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={imageZoom}
            alt="원본"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 bottom-36 z-[60] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-[90%] whitespace-pre-line text-center ${
            toast.kind === "success"
              ? "bg-emerald-600 text-white"
              : toast.kind === "error"
              ? "bg-red-500 text-white"
              : "bg-gray-800 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* 하단 고정 버튼 (미리보기 모드일 땐 matchId 없어도 노출) */}
      {(matchId || preview) && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-white border-t border-border px-4 pt-4"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2.5rem)" }}
        >
          {matchStatus === "pending" && (
            <div className="flex gap-3">
              <button
                onClick={() => handleAction("approved")}
                disabled={!!submitting}
                className="flex-1 py-4 rounded-2xl font-bold text-base text-white disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#ff8a3d" }}
              >
                {submitting === "approved" && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                매칭 요청
              </button>
              <button
                onClick={() => handleAction("rejected")}
                disabled={!!submitting}
                className="flex-1 py-4 rounded-2xl font-bold text-base bg-gray-100 text-gray-500 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting === "rejected" && <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />}
                거절
              </button>
            </div>
          )}
          {matchStatus === "approved" && (
            <div className="py-4 rounded-2xl text-center bg-green-50">
              <p className="text-green-600 font-bold text-base">매칭요청을 보냈습니다</p>
              <p className="text-green-700/80 text-xs mt-1">여성분이 수락하면 매칭이 완료됩니다 · 번복 불가</p>
            </div>
          )}
          {matchStatus === "rejected" && (
            <div className="space-y-2">
              <button
                onClick={() => handleAction("approved")}
                disabled={!!submitting}
                className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#ff8a3d" }}
              >
                {submitting === "approved" && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                수락으로 번복
              </button>
              <p className="text-center text-xs text-muted-fg">
                거절 후 7일 내에는 수락으로 번복할 수 있습니다
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function IC({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5 text-muted-fg/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center py-4 gap-3">
      <span className="w-7 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="text-sm text-muted-fg w-14 flex-shrink-0">{label}</span>
      <span className="text-[15px] font-medium text-foreground">{value}</span>
    </div>
  );
}
