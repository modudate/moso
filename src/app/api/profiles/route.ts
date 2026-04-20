import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, getUserById, updateProfile, getIdealType, getAdminNotes, getMdRecsForMale } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");
  const status = req.nextUrl.searchParams.get("status");
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
    const idealType = await getIdealType(id);
    const notes = await getAdminNotes(id);
    const mdRecs = user.role === "male" ? await getMdRecsForMale(id) : [];
    return NextResponse.json({ user, idealType, notes, mdRecs });
  }

  let result = await getAllUsers();
  if (role) result = result.filter((u: { role: string }) => u.role === role);
  if (status) result = result.filter((u: { status: string }) => u.status === status);

  // 사용자쪽 공개 리스트(활성 남성/여성 목록)는 edge 에서 60초 캐시 + SWR.
  // 관리자 승인/차단 직후 즉시 반영이 필요한 케이스는 role+status 가 없는
  // 전체 조회이므로 이 캐시가 걸리지 않음.
  const cacheable = !!role && status === "active";
  return NextResponse.json(result, {
    headers: cacheable
      ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
      : { "Cache-Control": "no-store" },
  });
}

export async function PATCH(req: NextRequest) {
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
