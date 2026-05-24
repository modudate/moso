import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// POST /api/admin/match-complete
//   관리자가 카카오톡 채팅방 초대 후 매칭을 최종 완료 처리.
//   match_requests.completed_at 을 현재 시각으로 설정.
//
// 권한: 관리자만
// Body: { matchId: string }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { matchId } = (await req.json()) as { matchId?: string };
  if (!matchId) {
    return NextResponse.json({ error: "matchId 필수" }, { status: 400 });
  }

  const db = await getDb();

  const { data: current, error: fetchErr } = await db
    .from("match_requests")
    .select("id, status, completed_at")
    .eq("id", matchId)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "매칭 요청 없음" }, { status: 404 });
  }
  if (current.status !== "approved") {
    return NextResponse.json({ error: "수락된 매칭만 완료처리할 수 있습니다." }, { status: 409 });
  }
  if (current.completed_at) {
    return NextResponse.json({ error: "이미 완료 처리된 매칭입니다." }, { status: 409 });
  }

  const completedAt = new Date().toISOString();
  const { error } = await db
    .from("match_requests")
    .update({ completed_at: completedAt })
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: "완료 처리 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true, completedAt });
}
