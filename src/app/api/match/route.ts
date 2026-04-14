import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  addMatchRequest, getMatchRequests, getMatchesForMale, getMatchesByFemale,
  updateMatchStatus, clearCart, isInCooldown, addRejectionLog, getMdRecsForMale,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const maleId = req.nextUrl.searchParams.get("maleId");
  const femaleId = req.nextUrl.searchParams.get("femaleId");
  const all = req.nextUrl.searchParams.get("all");

  if (all === "true") return NextResponse.json(getMatchRequests());
  if (maleId) {
    const matches = getMatchesForMale(maleId);
    const mdRecs = getMdRecsForMale(maleId);
    return NextResponse.json({ matches, mdRecs });
  }
  if (femaleId) return NextResponse.json(getMatchesByFemale(femaleId));
  return NextResponse.json({ error: "maleId 또는 femaleId 필요" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { femaleProfileId, maleProfileIds } = await req.json();
  const created: string[] = [];
  for (const maleId of maleProfileIds) {
    if (isInCooldown(femaleProfileId, maleId)) continue;
    addMatchRequest({
      id: uuidv4(),
      femaleProfileId,
      maleProfileId: maleId,
      status: "pending",
      requestedAt: new Date().toISOString(),
      respondedAt: null,
    });
    created.push(maleId);
  }
  clearCart(femaleProfileId);
  return NextResponse.json({ success: true, created });
}

export async function PATCH(req: NextRequest) {
  const { matchId, status } = await req.json();
  const mr = updateMatchStatus(matchId, status);
  if (!mr) return NextResponse.json({ error: "매칭 요청 없음" }, { status: 404 });

  if (status === "rejected") {
    addRejectionLog({
      id: uuidv4(),
      maleProfileId: mr.maleProfileId,
      femaleProfileId: mr.femaleProfileId,
      rejectedAt: new Date().toISOString(),
      visibleAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return NextResponse.json({ success: true, match: mr });
}
