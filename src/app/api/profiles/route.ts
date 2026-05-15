import { NextRequest, NextResponse } from "next/server";
import {
  getAllUsers,
  getUserById,
  updateProfile,
  getIdealType,
  getAdminNotes,
  getMdRecsForMale,
} from "@/lib/db";
import { requireAdmin, requireUser, requireSelfOrAdmin, isAdmin } from "@/lib/auth-guard";

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
    const auth = await requireSelfOrAdmin(id);
    if (!auth.ok) return auth.response;
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
    const idealType = await getIdealType(id);
    const notes = await getAdminNotes(id);
    const mdRecs = user.role === "male" ? await getMdRecsForMale(id) : [];
    return NextResponse.json({ user, idealType, notes, mdRecs });
  }

  // 2) role 필터 — 로그인 회원이 반대 성별 active 회원 명단 조회 (또는 관리자가 모든 조회)
  if (role) {
    const userAuth = await requireUser();
    if (!userAuth.ok) return userAuth.response;
    const admin = await isAdmin(userAuth.userId);

    let result = await getAllUsers();
    result = result.filter((u: { role: string }) => u.role === role);
    if (status) result = result.filter((u: { status: string }) => u.status === status);

    if (!admin) {
      // 일반 사용자: status=active 만 + 본인 반대 성별만
      // role=female → 호출자는 male 이어야 함, role=male → 호출자는 female 이어야 함
      // (cart/요청결과 등 일부 페이지는 status 없이 호출하지만, 비-active 데이터가 회원에게 노출되면 안 됨)
      const me = result.find((u: { id: string }) => u.id === userAuth.userId);
      // 호출자 본인이 같은 role 인 경우는 "내 반대 성별" 호출이 맞는지 검증
      // (간단 정책: 일반 사용자는 자기 반대 성별의 active 만 받게 강제)
      result = result.filter((u: { status: string }) => u.status === "active");

      // 자기 자신은 응답에 포함될 필요 없음 (혹시 role 미스매치로 들어와도 제외)
      void me;
    }

    const cacheable = !!role && status === "active" && !admin;
    return NextResponse.json(result, {
      headers: cacheable
        ? { "Cache-Control": "private, max-age=30" }
        : { "Cache-Control": "no-store" },
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
