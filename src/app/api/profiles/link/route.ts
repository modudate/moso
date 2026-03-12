import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { addLink, getLinkByToken, getProfile } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { profileId } = await req.json();
  const token = nanoid(12);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  addLink({
    token,
    profileId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  return NextResponse.json({ token, expiresAt: expiresAt.toISOString() });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
  }

  const link = getLinkByToken(token);
  if (!link) {
    return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });
  }

  if (new Date() > new Date(link.expiresAt)) {
    return NextResponse.json({ error: "만료된 링크입니다." }, { status: 410 });
  }

  const profile = getProfile(link.profileId);
  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(profile);
}
