import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { addProfileLink, getProfileLinkByToken, getUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  const user = getUser(userId);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });

  const token = nanoid(12);
  const now = new Date();
  const expires = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  addProfileLink({ token, userId, createdAt: now.toISOString(), expiresAt: expires.toISOString() });
  return NextResponse.json({ token, url: `/profile/${token}` });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "토큰 필요" }, { status: 400 });

  const link = getProfileLinkByToken(token);
  if (!link) return NextResponse.json({ error: "유효하지 않은 링크" }, { status: 404 });
  if (new Date(link.expiresAt) < new Date()) return NextResponse.json({ error: "만료된 링크" }, { status: 410 });

  const user = getUser(link.userId);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });

  const { password, phone, email, ...safeUser } = user;
  return NextResponse.json(safeUser);
}
