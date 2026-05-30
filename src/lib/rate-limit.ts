import { NextResponse } from "next/server";

// 경량 인메모리 rate limiter (고정 윈도우 카운터).
//
// 주의: Vercel 서버리스는 인스턴스가 분산되므로 "인스턴스별" 카운트라
// 완벽한 전역 제한은 아니다. 다만 한 인스턴스로 쏟아지는 연타/봇 버스트를
// 억제하는 1차 방어로는 충분하며, 외부 의존성(Redis 등) 없이 즉시 적용 가능하다.
// 정밀한 전역 제한이 필요해지면 Upstash Ratelimit 등으로 교체할 것.

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();
let lastSweep = 0;

// 만료된 버킷 정리 (메모리 누수 방지). 최대 1분에 1회만 수행.
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) {
    if (now >= b.resetAt) store.delete(k);
  }
}

export type RateLimitResult = { ok: boolean; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true, retryAfter: 0 };
}

// 요청에서 클라이언트 IP 추출 (Vercel: x-forwarded-for 의 첫 항목)
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// 429 표준 응답
export function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
