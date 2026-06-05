import { NextRequest, NextResponse } from "next/server";
import {
  getAllUsers,
  getActiveProfilesByRole,
  getPublicProfileById,
  getUserById,
  updateProfile,
  getIdealType,
  getAdminNotes,
  getMdRecsForMale,
  getMdRecsForFemale,
} from "@/lib/db";
import { requireAdmin, requireUser, isAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────
// GET /api/profiles
//
// 권한 정책:
//   · ?id=<userId>            → 본인 또는 관리자만 (개인 정보 노출 방지)
//   · ?role=&status=active    → 로그인한 active 회원이 본인 반대 성별을 조회 (또는 관리자)
//   · 그 외 (전체 조회)        → 관리자만
// ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");
  const status = req.nextUrl.searchParams.get("status");
  const id = req.nextUrl.searchParams.get("id");

  // 1) 단건 조회
  if (id) {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const admin = await isAdmin(auth.userId);

    // 본인 또는 관리자: 이상형/메모/추천까지 포함한 전체 정보
    if (admin || auth.userId === id) {
      const user = await getUserById(id);
      if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
      const idealType = await getIdealType(id);
      const notes = await getAdminNotes(id);
      const mdRecs = user.role === "male" ? await getMdRecsForMale(id) : await getMdRecsForFemale(id);
      return NextResponse.json({ user, idealType, notes, mdRecs });
    }

    // 그 외 로그인 회원: active 상대의 공개 프로필 단건만 (민감 필드 제외)
    // 전체 목록을 받아 find 하던 비효율을 제거하기 위한 단건 경로.
    const pub = await getPublicProfileById(id);
    if (!pub) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
    return NextResponse.json(
      { user: pub },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  }

  // 2) role 필터 — 로그인 회원이 반대 성별 active 회원 명단 조회 (또는 관리자가 모든 조회)
  if (role !== "male" && role !== "female") {
    // role 파라미터가 없거나 잘못된 경우는 아래 3) 전체 조회(관리자)로 처리
  } else {
    const userAuth = await requireUser();
    if (!userAuth.ok) return userAuth.response;
    const admin = await isAdmin(userAuth.userId);

    // 관리자가 active 가 아닌 상태까지 보려는 경우에만 전체 조회(레거시 경로) 사용.
    if (admin && status && status !== "active") {
      let result = await getAllUsers();
      result = result.filter((u: { role: string }) => u.role === role);
      result = result.filter((u: { status: string }) => u.status === status);
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    // 일반 경로(갤러리/카트/요청함): DB 에서 active+role 필터 + 카드용 컬럼만 조회.
    // 전체 회원 풀스캔/전송을 제거한 핵심 최적화.
    const list = await getActiveProfilesByRole(role);
    return NextResponse.json(list, {
      headers: admin
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "private, max-age=30" },
    });
  }

  // 3) 전체 조회는 관리자 전용
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const result = await getAllUsers();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/profiles  (관리자 전용)
//   · 회원 인라인 수정 / 상태 변경 / 만료일 / 반려 사유 등
//   · 일반 사용자가 호출 시도 → 403
// ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  try {
    await updateProfile(id, updates);
    const user = await getUserById(id);
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
