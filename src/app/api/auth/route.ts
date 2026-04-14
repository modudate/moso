import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TODO: Google OAuth 연동 시 이 API를 Supabase Auth로 대체
export async function POST() {
  return NextResponse.json({ message: "Google OAuth 연동 예정" }, { status: 501 });
}
