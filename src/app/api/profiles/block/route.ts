import { NextRequest, NextResponse } from "next/server";
import { toggleBlock } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  const profile = toggleBlock(id);
  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ success: true, blocked: profile.blocked });
}
