// 노출기간(visibility window) 정책 단일 진실원
//
// 정책 (2026-05-15 확정):
//   · pending  : 요청일 + 30일 (역시 자정 기준)
//   · approved : 응답일(KST) 자정 + 7일 → "다음 동일 요일 0시"에 만료 (= 168시간)
//   · rejected : 응답일(KST) 자정 + 7일 → 남성 측 "번복 가능" 기간과 동일
//
// startOfDayKst: 어떤 ISO 시각이든 KST 기준 그날 00:00:00 의 ms 로 normalize.
// 만료(visibleUntil) = startOfDayKst(t) + days * DAY_MS
//
// 예) 응답이 화 22:00 KST 면 → startOfDayKst = 화 00:00 → +7일 = 다음 화 00:00 만료.

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function startOfDayKstMs(iso: string): number {
  const t = new Date(iso).getTime();
  const kst = t + KST_OFFSET_MS;
  const dayStartKst = Math.floor(kst / DAY_MS) * DAY_MS;
  return dayStartKst - KST_OFFSET_MS; // UTC ms
}

export const PENDING_VISIBLE_DAYS = 30;
export const RESPONDED_VISIBLE_DAYS = 7;

export type VisibilityItem = {
  status: string;
  requestedAt: string;
  respondedAt?: string | null;
};

// 현재 시각 기준으로 카드가 노출되어야 하는지 판정
export function isVisibleNow(item: VisibilityItem, now: number = Date.now()): boolean {
  if (item.status === "pending") {
    const until = startOfDayKstMs(item.requestedAt) + PENDING_VISIBLE_DAYS * DAY_MS;
    return now < until;
  }
  // approved / rejected — 응답일(KST 자정) + 7일
  if (!item.respondedAt) return false;
  const until = startOfDayKstMs(item.respondedAt) + RESPONDED_VISIBLE_DAYS * DAY_MS;
  return now < until;
}

// UI 표시용 — 만료 시각 ISO (없으면 null)
export function visibleUntilIso(item: VisibilityItem): string | null {
  if (item.status === "pending") {
    const t = startOfDayKstMs(item.requestedAt) + PENDING_VISIBLE_DAYS * DAY_MS;
    return new Date(t).toISOString();
  }
  if (!item.respondedAt) return null;
  const t = startOfDayKstMs(item.respondedAt) + RESPONDED_VISIBLE_DAYS * DAY_MS;
  return new Date(t).toISOString();
}
