import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createServiceClient } from "@/lib/supabase/server";
import { getUserById, getProfileLinksByUser, deleteProfileLink } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId 필요" }, { status: 400 });

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });

  const service = await createServiceClient();
  const token = nanoid(12);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const { error } = await service.from("profile_links").insert({
    token,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
    access_count: 0,
    max_access: 10,
  });

  if (error) {
    return NextResponse.json({ error: "링크 생성 실패: " + error.message }, { status: 500 });
  }

  return NextResponse.json({
    token,
    url: `/profile/${token}`,
    link: {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      accessCount: 0,
      maxAccess: 10,
    },
  });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const userId = req.nextUrl.searchParams.get("userId");

  // 관리자: 특정 회원의 발급된 프로필 링크 목록 조회
  if (userId) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const links = await getProfileLinksByUser(userId);
    return NextResponse.json({ links });
  }

  if (!token) return NextResponse.json({ error: "토큰 필요" }, { status: 400 });

  const service = await createServiceClient();

  const { data: link, error } = await service
    .from("profile_links")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !link) return NextResponse.json({ error: "유효하지 않은 링크" }, { status: 404 });
  if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: "만료된 링크" }, { status: 410 });
  if (link.access_count >= link.max_access) return NextResponse.json({ error: "접근 횟수 초과" }, { status: 429 });

  // 접근 횟수 증가
  await service
    .from("profile_links")
    .update({ access_count: link.access_count + 1 })
    .eq("token", token);

  const user = await getUserById(link.user_id);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });

  const { phone: _phone, email: _email, ...safeUser } = user;
  return NextResponse.json(safeUser);
}

// DELETE /api/profiles/link?token=...  (관리자 전용 — 발급된 링크 삭제)
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "토큰 필요" }, { status: 400 });

  try {
    await deleteProfileLink(token);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "링크 삭제 실패: " + String(err) }, { status: 500 });
  }
}
