import { NextRequest, NextResponse } from "next/server";
import { getMdRecsForMale, addMdRecommendation, deleteMdRecommendation } from "@/lib/db";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const maleId = req.nextUrl.searchParams.get("maleId");
  if (maleId) return NextResponse.json(await getMdRecsForMale(maleId));

  const db = await getDb();
  const { data } = await db.from("md_recommendations").select("*").order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const { maleProfileId, femaleProfileId } = await req.json();
  if (!maleProfileId || !femaleProfileId) {
    return NextResponse.json({ error: "maleProfileId, femaleProfileId 필수" }, { status: 400 });
  }

  const existing = await getMdRecsForMale(maleProfileId);
  if (existing.some((md: { femaleProfileId: string }) => md.femaleProfileId === femaleProfileId)) {
    return NextResponse.json({ error: "이미 추천된 여성입니다" }, { status: 409 });
  }

  try {
    const md = await addMdRecommendation(maleProfileId, femaleProfileId);
    return NextResponse.json({ success: true, md });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  try {
    await deleteMdRecommendation(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
