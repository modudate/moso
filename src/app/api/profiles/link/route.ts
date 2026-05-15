import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { addProfileLink, getProfileLinkByToken, getUser, incrementLinkAccess } from "@/lib/store";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await req.json();
  const user = getUser(userId);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });

  const token = nanoid(12);
  const now = new Date();
  const expires = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  addProfileLink({ token, userId, createdAt: now.toISOString(), expiresAt: expires.toISOString(), accessCount: 0, maxAccess: 10 });
  return NextResponse.json({ token, url: `/profile/${token}` });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "토큰 필요" }, { status: 400 });

  const link = getProfileLinkByToken(token);
  if (!link) return NextResponse.json({ error: "유효하지 않은 링크" }, { status: 404 });
  if (new Date(link.expiresAt) < new Date()) return NextResponse.json({ error: "만료된 링크" }, { status: 410 });
  if (link.accessCount >= link.maxAccess) return NextResponse.json({ error: "접근 횟수 초과" }, { status: 429 });

  incrementLinkAccess(token);
  const user = getUser(link.userId);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });

  const { phone, email, ...safeUser } = user;
  return NextResponse.json(safeUser);
}
