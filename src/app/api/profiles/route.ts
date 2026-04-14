import { NextRequest, NextResponse } from "next/server";
import { getUsers, getUser, updateUser, addUser, addIdealType, runAutoBlock, getIdealType, getAdminNotes, getMdRecsForMale } from "@/lib/store";
import { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  runAutoBlock();
  const role = req.nextUrl.searchParams.get("role");
  const status = req.nextUrl.searchParams.get("status");
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const user = getUser(id);
    if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
    const idealType = getIdealType(id);
    const notes = getAdminNotes(id);
    const mdRecs = user.role === "male" ? getMdRecsForMale(id) : [];
    return NextResponse.json({ user, idealType, notes, mdRecs });
  }

  let result = getUsers();
  if (role) result = result.filter((u) => u.role === role);
  if (status) result = result.filter((u) => u.status === status);
  result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = `${body.role === "male" ? "m" : "f"}-${Date.now()}`;

  const newUser: User = {
    id,
    email: `${id}@register.local`,
    phone: body.phone,
    role: body.role,
    status: "pending",
    createdAt: new Date().toISOString(),
    realName: body.realName,
    nickname: body.nickname,
    birthYear: typeof body.birthYear === "string" ? parseInt(body.birthYear) : body.birthYear,
    height: typeof body.height === "string" ? parseInt(body.height) : body.height,
    city: body.city,
    district: body.district || "",
    workplace: body.workplace,
    job: body.job || body.workplace,
    workPattern: body.workPattern,
    salary: body.salary,
    education: body.education,
    smoking: body.smoking,
    mbti: body.mbti,
    charm: body.charm,
    datingStyle: body.datingStyle,
    photoUrls: [],
    charmPhoto: null,
    datePhoto: null,
    expiresAt: null,
  };

  addUser(newUser);

  if (body.idealType) {
    addIdealType({ userId: id, ...body.idealType });
  }

  return NextResponse.json({ success: true, id });
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });
  const user = updateUser(id, updates);
  if (!user) return NextResponse.json({ error: "유저 없음" }, { status: 404 });
  return NextResponse.json({ success: true, user });
}
