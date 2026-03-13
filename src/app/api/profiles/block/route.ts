import { NextRequest, NextResponse } from "next/server";
import { updateUser, getUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  const user = getUser(id);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
  updateUser(id, { blocked: !user.blocked });
  return NextResponse.json({ success: true, blocked: !user.blocked });
}
