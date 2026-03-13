import { NextRequest, NextResponse } from "next/server";
import { getUsers, updateUser, runAutoBlock } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  runAutoBlock();
  const gender = req.nextUrl.searchParams.get("gender");
  const status = req.nextUrl.searchParams.get("status");
  let result = getUsers();
  if (gender) result = result.filter((u) => u.gender === gender);
  if (status) result = result.filter((u) => u.status === status);
  result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });
  const user = updateUser(id, updates);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
  return NextResponse.json({ success: true, user });
}
