import { NextRequest, NextResponse } from "next/server";
import { updateUser, getUser } from "@/lib/store";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// (legacy) 회원 차단/해제 토글. 신규 코드에서는 PATCH /api/profiles 사용 권장.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  const user = getUser(id);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
  const newStatus = user.status === "blocked" ? "active" : "blocked";
  updateUser(id, { status: newStatus });
  return NextResponse.json({ success: true, status: newStatus });
}
