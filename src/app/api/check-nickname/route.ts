import { NextRequest, NextResponse } from "next/server";
import { isNicknameTaken } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { validateNickname } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("nickname") ?? "";
  const v = validateNickname(raw);
  if (!v.ok) {
    return NextResponse.json({ ok: false, reason: v.reason });
  }

  // 본인 가입 중일 경우 본인 user_id 는 중복에서 제외 (재제출 시나리오 대비)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const exclude = user?.id;

  const taken = await isNicknameTaken(raw.trim(), exclude);
  if (taken) {
    return NextResponse.json({ ok: false, reason: "이미 사용 중인 닉네임입니다" });
  }
  return NextResponse.json({ ok: true });
}
