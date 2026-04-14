import { NextRequest, NextResponse } from "next/server";
import { addMdRecommendation, getMdRecsForMale, getMdRecommendations } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const maleId = req.nextUrl.searchParams.get("maleId");
  if (maleId) return NextResponse.json(getMdRecsForMale(maleId));
  return NextResponse.json(getMdRecommendations());
}

export async function POST(req: NextRequest) {
  const { maleProfileId, femaleProfileId } = await req.json();
  if (!maleProfileId || !femaleProfileId) {
    return NextResponse.json({ error: "maleProfileId, femaleProfileId 필수" }, { status: 400 });
  }

  const existing = getMdRecsForMale(maleProfileId);
  if (existing.some(md => md.femaleProfileId === femaleProfileId)) {
    return NextResponse.json({ error: "이미 추천된 여성입니다" }, { status: 409 });
  }

  const md = {
    id: `md-${Date.now()}`,
    maleProfileId,
    femaleProfileId,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };
  addMdRecommendation(md);
  return NextResponse.json({ success: true, md });
}
