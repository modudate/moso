"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchRequest, User } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────
// 매칭 요청 결과 페이지
//   - /api/match?femaleId={내ID}  → 내가 보낸 매칭 요청 목록
//   - /api/profiles?role=male      → 상대 남성 프로필 정보 (JOIN 용)
//   - 카드 클릭 시 /female/{maleProfileId} 상세페이지로 이동
// ─────────────────────────────────────────────────────────────────────

type RequestStatus = "pending" | "approved" | "rejected";

type RequestCardData = {
  id: string;
  maleProfileId: string;
  nickname: string;
  birthYear: number;
  height: number;
  workplace: string;
  job: string;
  region: string;
  mbti: string;
  photo: string;
  status: RequestStatus;
  requestedAt: string;
  respondedAt: string | null;
};

type Tab = "all" | RequestStatus;

const TAB_LABEL: Record<Tab, string> = {
  all: "전체",
  pending: "대기중",
  approved: "수락",
  rejected: "거절",
};

const formatRelative = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function MatchRequestResultPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [requests, setRequests] = useState<RequestCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewBlocked, setPreviewBlocked] = useState(false);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/me", { cache: "no-store" });
      const { user: me } = await meRes.json();
      const uid = me?.id;

      // 미리보기/비로그인 → 안내 화면 (실제 데이터 없음)
      if (!uid) {
        setPreviewBlocked(true);
        setRequests([]);
        return;
      }

      const [matchRes, malesRes] = await Promise.all([
        fetch(`/api/match?femaleId=${encodeURIComponent(uid)}`, { cache: "no-store" }),
        fetch("/api/profiles?role=male", { cache: "no-store" }),
      ]);
      const matches: MatchRequest[] = await matchRes.json();
      const males: User[] = await malesRes.json();
      const maleMap = new Map(males.map((m) => [m.id, m]));

      const cards: RequestCardData[] = matches
        .map((m): RequestCardData | null => {
          const u = maleMap.get(m.maleProfileId);
          if (!u) return null;
          return {
            id: m.id,
            maleProfileId: m.maleProfileId,
            nickname: u.nickname,
            birthYear: u.birthYear,
            height: u.height,
            workplace: u.workplace,
            job: u.job,
            region: `${u.city ?? ""} ${u.district ?? ""}`.trim(),
            mbti: u.mbti,
            photo: u.photoUrls?.[0] ?? "",
            status: (m.status as RequestStatus) ?? "pending",
            requestedAt: m.requestedAt,
            respondedAt: m.respondedAt ?? null,
          };
        })
        .filter((x): x is RequestCardData => x !== null)
        .sort(
          (a, b) =>
            new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
        );

      setRequests(cards);
      setPreviewBlocked(false);
    } catch (err) {
      console.error("매칭 요청 결과 조회 실패", err);
      alert(`매칭 요청 결과를 불러오지 못했습니다.\n${err instanceof Error ? err.message : ""}`);
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const r of requests) c[r.status]++;
    return c;
  }, [requests]);

  const filtered = useMemo(
    () => (tab === "all" ? requests : requests.filter((r) => r.status === tab)),
    [tab, requests],
  );

  return (
    <main className="min-h-screen bg-background mx-auto max-w-[430px] pb-20">
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-white/90 hover:text-white"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1 text-white">
            매칭 요청 결과 {!loading && !previewBlocked && `(${requests.length})`}
          </h1>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : previewBlocked ? (
        <div className="px-6 pt-16 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">로그인이 필요한 기능입니다</h2>
          <p className="text-sm text-muted-fg leading-relaxed">
            매칭 요청 결과는 정식 로그인 후 이용할 수 있어요.<br />
            홈 화면에서 <b>‘Google 계정으로 계속하기’</b> 로<br />
            로그인 후 다시 시도해주세요.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 px-6 py-3 rounded-xl text-white font-semibold shadow-md"
            style={{ backgroundColor: "#ff8a3d" }}
          >
            로그인 하러 가기
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="px-6 pt-16 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-foreground">아직 보낸 매칭 요청이 없어요</h2>
          <p className="text-sm text-muted-fg leading-relaxed">
            마음에 드는 분의 프로필에서 하트를 눌러<br />
            매칭 후보에 담은 뒤, 매칭 요청을 보내보세요!
          </p>
          <button
            onClick={() => router.push("/female")}
            className="mt-2 px-6 py-3 rounded-xl text-white font-semibold shadow-md"
            style={{ backgroundColor: "#ff8a3d" }}
          >
            프로필 둘러보기
          </button>
        </div>
      ) : (
        <>
          {/* 상태 탭 */}
          <div className="px-4 mt-4">
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold border transition-all ${
                      active
                        ? "text-white border-transparent shadow-sm"
                        : "bg-white border-border text-muted-fg hover:border-gray-400"
                    }`}
                    style={active ? { backgroundColor: "#ff8a3d" } : {}}
                  >
                    {TAB_LABEL[t]}
                    <span
                      className={`ml-1.5 text-[11px] inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full ${
                        active ? "bg-white/25 text-white" : "bg-muted text-muted-fg"
                      }`}
                    >
                      {counts[t]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 카드 리스트 */}
          <div className="px-4 mt-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-fg">
                <p className="text-base">해당 상태의 매칭 요청이 없습니다</p>
              </div>
            ) : (
              filtered.map((r) => (
                <RequestCard
                  key={r.id}
                  req={r}
                  onOpen={() => router.push(`/female/${r.maleProfileId}`)}
                />
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}

function RequestCard({ req, onOpen }: { req: RequestCardData; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm transition-all cursor-pointer hover:shadow-md hover:border-[#ff8a3d]/30 active:scale-[0.99]"
    >
      {/* 상단 - 프로필 정보 */}
      <div className="flex gap-3 p-4">
        <div className="w-20 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
          {req.photo ? (
            <img src={req.photo} alt={req.nickname} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary/20">
              {req.nickname?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-foreground text-base truncate">{req.nickname}</h3>
            <StatusBadge status={req.status} />
          </div>
          <p className="text-sm text-muted-fg mt-1">
            {req.birthYear}년생 · {req.height}cm
          </p>
          <p className="text-xs text-muted-fg/80 mt-0.5">
            {req.workplace} · {req.job}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {req.region && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{req.region}</span>}
            {req.mbti && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{req.mbti}</span>}
          </div>
        </div>
        <svg
          className="w-4 h-4 text-muted-fg/40 flex-shrink-0 self-center"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* 하단 - 상태별 메시지 */}
      <StatusMessage req={req} />
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, { label: string; cls: string }> = {
    pending: { label: "응답 대기", cls: "bg-amber-100 text-amber-700" },
    approved: { label: "매칭 성공", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "매칭 무산", cls: "bg-gray-200 text-gray-600" },
  };
  const s = map[status];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${s.cls}`}>
      {s.label}
    </span>
  );
}

function StatusMessage({ req }: { req: RequestCardData }) {
  if (req.status === "pending") {
    return (
      <div className="border-t border-border bg-amber-50/40 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-amber-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">상대방의 응답을 기다리고 있어요</p>
          <p className="text-[11px] text-amber-700/80 mt-0.5">{formatRelative(req.requestedAt)} 요청</p>
        </div>
      </div>
    );
  }

  if (req.status === "approved") {
    return (
      <div className="border-t border-border bg-emerald-50/50 px-4 py-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🎉</span>
          <p className="text-sm font-bold text-emerald-800">매칭이 성사되었어요!</p>
        </div>
        <p className="text-[12px] text-emerald-700/90 leading-relaxed">
          곧 운영진을 통해 카카오톡으로 연락처를 전달드릴게요.
        </p>
        <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-700/80">
          <span>요청 {formatRelative(req.requestedAt)}</span>
          <span>응답 {req.respondedAt && formatRelative(req.respondedAt)}</span>
        </div>
      </div>
    );
  }

  // rejected
  return (
    <div className="border-t border-border bg-gray-50 px-4 py-3 space-y-1.5">
      <p className="text-sm font-semibold text-gray-700">아쉽지만 매칭이 성사되지 않았어요</p>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        더 잘 맞는 분이 분명 있을 거예요. 다른 프로필도 살펴보세요!
      </p>
      <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
        <span>요청 {formatDate(req.requestedAt)}</span>
        <span>응답 {req.respondedAt && formatDate(req.respondedAt)}</span>
      </div>
    </div>
  );
}
