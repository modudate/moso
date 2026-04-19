import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, getUserById, updateProfile, getIdealType, getAdminNotes, getMdRecsForMale } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");
  const status = req.nextUrl.searchParams.get("status");
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
    const idealType = await getIdealType(id);
    const notes = await getAdminNotes(id);
    const mdRecs = user.role === "male" ? await getMdRecsForMale(id) : [];
    return NextResponse.json({ user, idealType, notes, mdRecs });
  }

  let result = await getAllUsers();
  if (role) result = result.filter((u: { role: string }) => u.role === role);
  if (status) result = result.filter((u: { status: string }) => u.status === status);
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  try {
    await updateProfile(id, updates);
    const user = await getUserById(id);
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
