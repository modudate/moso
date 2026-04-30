"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────
// 임시(Mock) 데이터: 실제 API 연동 전, 화면 구성 확인용
// 실제 운영 시 /api/match 결과 + 남성 프로필 정보를 합쳐 동일한 형태로 매핑하면 됨
//   → 카드 클릭 시 router.push(`/female/${maleProfileId}`) 로 상세페이지 이동.
//   → 샘플 5건은 seed 의 실제 남성 user_id 와 매핑되어 있어 클릭 시 정상 동작합니다.
// ─────────────────────────────────────────────────────────────────────
type RequestStatus = "pending" | "approved" | "rejected";

type MockRequest = {
  id: string;
  // 실제 남성 프로필 user_id. null 이면 데모 전용(상세페이지 없음)
  maleProfileId: string | null;
  nickname: string;
  birthYear: number;
  height: number;
  workplace: string;
  job: string;
  region: string;
  mbti: string;
  photo: string;
  status: RequestStatus;
  requestedAt: string; // ISO
  respondedAt: string | null;
  // 수락된 경우 연락처 전달 예정 시간
  contactSharedAt?: string | null;
};

const NOW = Date.now();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

const MOCK_REQUESTS: MockRequest[] = [
  {
    id: "req-1",
    maleProfileId: "11111111-0000-0000-0000-000000000004",
    nickname: "도윤",
    birthYear: 1991,
    height: 178,
    workplace: "전문직",
    job: "변호사",
    region: "서울 마포구",
    mbti: "ENTJ",
    photo:
      "https://images.unsplash.com/photo-1616326431985-b9f89ebc6ab7?w=400&h=500&fit=crop",
    status: "approved",
    requestedAt: daysAgo(3),
    respondedAt: daysAgo(1),
    contactSharedAt: daysAgo(0),
  },
  {
    id: "req-2",
    maleProfileId: "11111111-0000-0000-0000-000000000001",
    nickname: "준혁",
    birthYear: 1995,
    height: 180,
    workplace: "대기업",
    job: "개발자",
    region: "서울 강남구",
    mbti: "INTJ",
    photo:
      "https://images.unsplash.com/photo-1624979215572-1230abc53d7c?w=400&h=500&fit=crop",
    status: "pending",
    requestedAt: daysAgo(2),
    respondedAt: null,
  },
  {
    id: "req-3",
    maleProfileId: "11111111-0000-0000-0000-000000000002",
    nickname: "민수",
    birthYear: 1993,
    height: 176,
    workplace: "스타트업",
    job: "기획/전략",
    region: "서울 광진구",
    mbti: "ENFP",
    photo:
      "https://images.unsplash.com/photo-1633177188754-980c2a6b6266?w=400&h=500&fit=crop",
    status: "pending",
    requestedAt: daysAgo(1),
    respondedAt: null,
  },
  {
    id: "req-4",
    maleProfileId: "11111111-0000-0000-0000-000000000003",
    nickname: "서준",
    birthYear: 1997,
    height: 182,
    workplace: "공무원",
    job: "행정직",
    region: "경기 성남시",
    mbti: "ISFJ",
    photo:
      "https://images.unsplash.com/photo-1628264045147-122484104d48?w=400&h=500&fit=crop",
    status: "rejected",
    requestedAt: daysAgo(5),
    respondedAt: daysAgo(3),
  },
  {
    id: "req-5",
    maleProfileId: "11111111-0000-0000-0000-000000000005",
    nickname: "우진",
    birthYear: 1996,
    height: 175,
    workplace: "중견기업",
    job: "마케팅",
    region: "인천 연수구",
    mbti: "ESTP",
    photo:
      "https://images.unsplash.com/photo-1718986017030-b6ba6f96827b?w=400&h=500&fit=crop",
    status: "approved",
    requestedAt: daysAgo(7),
    respondedAt: daysAgo(5),
    contactSharedAt: daysAgo(4),
  },
  {
    id: "req-6",
    maleProfileId: null,
    nickname: "지훈",
    birthYear: 1992,
    height: 184,
    workplace: "전문직",
    job: "의사",
    region: "서울 송파구",
    mbti: "INFJ",
    photo:
      "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&h=500&fit=crop",
    status: "pending",
    requestedAt: daysAgo(0),
    respondedAt: null,
  },
  {
    id: "req-7",
    maleProfileId: null,
    nickname: "현우",
    birthYear: 1994,
    height: 179,
    workplace: "공기업",
    job: "기술직",
    region: "서울 영등포구",
    mbti: "ISTJ",
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    status: "rejected",
    requestedAt: daysAgo(10),
    respondedAt: daysAgo(8),
  },
];

// ─────────────────────────────────────────────────────────────────────

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

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: MOCK_REQUESTS.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const r of MOCK_REQUESTS) c[r.status]++;
    return c;
  }, []);

  const filtered = useMemo(
    () => (tab === "all" ? MOCK_REQUESTS : MOCK_REQUESTS.filter((r) => r.status === tab)),
    [tab]
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
            매칭 요청 결과 ({MOCK_REQUESTS.length})
          </h1>
        </div>
      </header>

      {/* 안내 배너 (임시 데이터 구분용) */}
      <div className="px-4 pt-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700 leading-relaxed">
          ⚠️ 표시되는 데이터는 화면 확인용 샘플입니다.
          <br />
          (seed 의 5명은 실제 프로필이라 카드 클릭 시 상세페이지로 이동됩니다)
        </div>
      </div>

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
              onOpen={() => {
                if (r.maleProfileId) {
                  router.push(`/female/${r.maleProfileId}`);
                } else {
                  alert("샘플(데모용) 프로필이라 상세페이지가 없습니다.\n실제 데이터 연동 시 자동으로 상세페이지가 열려요.");
                }
              }}
            />
          ))
        )}
      </div>
    </main>
  );
}

function RequestCard({ req, onOpen }: { req: MockRequest; onOpen: () => void }) {
  const clickable = true;
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
      className={`bg-card rounded-2xl border border-border overflow-hidden shadow-sm transition-all ${
        clickable ? "cursor-pointer hover:shadow-md hover:border-[#ff8a3d]/30 active:scale-[0.99]" : ""
      }`}
    >
      {/* 상단 - 프로필 정보 */}
      <div className="flex gap-3 p-4">
        <div className="w-20 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
          <img src={req.photo} alt={req.nickname} className="w-full h-full object-cover" />
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
            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{req.region}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{req.mbti}</span>
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

function StatusMessage({ req }: { req: MockRequest }) {
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
          <p className="text-[11px] text-amber-700/80 mt-0.5">
            {formatRelative(req.requestedAt)} 요청
          </p>
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
          {req.contactSharedAt
            ? "운영진을 통해 카카오톡으로 연락처가 전달되었어요. 좋은 인연 되세요!"
            : "곧 운영진을 통해 카카오톡으로 연락처를 전달드릴게요."}
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
