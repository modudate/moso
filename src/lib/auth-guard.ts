// 서버 사이드 인증/인가 가드 표준화
//
// 모든 API 라우트는 본 모듈의 가드 함수를 사용해서 권한 검증을 수행한다.
// (가드 누락이 그동안 다수의 API 노출 사고를 만들었음)
//
// 사용 패턴:
//   const auth = await requireAdmin();
//   if (!auth.ok) return auth.response;
//   // 이 아래는 admin 임이 보장됨 (auth.userId 사용 가능)

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type GuardOk = { ok: true; userId: string; email?: string };
export type GuardFail = { ok: false; response: NextResponse };
export type GuardResult = GuardOk | GuardFail;

function deny(status: number, message: string): GuardFail {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) };
}

// ── requireUser: Supabase 세션이 있는 모든 사용자 (가입 미완료 포함) ─────
export async function requireUser(): Promise<GuardResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return deny(401, "로그인이 필요합니다.");
  return { ok: true, userId: user.id, email: user.email ?? undefined };
}

// ── requireActiveUser: users 테이블의 active 회원 ─────────────────────
export async function requireActiveUser(): Promise<
  GuardResult & { ok: true; role: "male" | "female" } | GuardFail
> {
  const base = await requireUser();
  if (!base.ok) return base;
  const service = await createServiceClient();
  const { data: u } = await service
    .from("users")
    .select("role, status")
    .eq("id", base.userId)
    .maybeSingle();
  if (!u) return deny(403, "회원가입이 완료되지 않은 계정입니다.");
  if (u.status !== "active") return deny(403, `현재 계정 상태(${u.status})로는 이용할 수 없습니다.`);
  if (u.role !== "male" && u.role !== "female") return deny(403, "알 수 없는 회원 유형입니다.");
  return { ok: true, userId: base.userId, email: base.email, role: u.role };
}

// ── requireActiveFemale ───────────────────────────────────────────────
export async function requireActiveFemale(): Promise<GuardResult> {
  const r = await requireActiveUser();
  if (!r.ok) return r;
  if (r.role !== "female") return deny(403, "여성 회원만 사용할 수 있는 기능입니다.");
  return { ok: true, userId: r.userId, email: r.email };
}

// ── requireActiveMale ─────────────────────────────────────────────────
export async function requireActiveMale(): Promise<GuardResult> {
  const r = await requireActiveUser();
  if (!r.ok) return r;
  if (r.role !== "male") return deny(403, "남성 회원만 사용할 수 있는 기능입니다.");
  return { ok: true, userId: r.userId, email: r.email };
}

// ── requireAdmin: admins 테이블에 등록된 사용자 ────────────────────────
export async function requireAdmin(): Promise<GuardResult> {
  const base = await requireUser();
  if (!base.ok) return base;
  const service = await createServiceClient();
  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("id", base.userId)
    .maybeSingle();
  if (!admin) return deny(403, "관리자만 접근할 수 있습니다.");
  return { ok: true, userId: base.userId, email: base.email };
}

// ── requireSelfOrAdmin: 본인 또는 관리자 ────────────────────────────────
//   회원 단건 조회/수정 등 "본인 또는 운영자만" 허용해야 하는 케이스에 사용.
export async function requireSelfOrAdmin(targetUserId: string): Promise<GuardResult> {
  const base = await requireUser();
  if (!base.ok) return base;
  if (base.userId === targetUserId) return { ok: true, userId: base.userId, email: base.email };
  const service = await createServiceClient();
  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("id", base.userId)
    .maybeSingle();
  if (admin) return { ok: true, userId: base.userId, email: base.email };
  return deny(403, "본인 또는 관리자만 접근할 수 있습니다.");
}

// ── isAdmin: 관리자 여부만 boolean 으로 ────────────────────────────────
export async function isAdmin(userId: string): Promise<boolean> {
  const service = await createServiceClient();
  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return !!admin;
}
