import { NextRequest, NextResponse } from "next/server";
import { getAllMatchRequests, getMatchRequests, getMdRecsForMale, getCooldownMaleIds } from "@/lib/db";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const maleId = req.nextUrl.searchParams.get("maleId");
  const femaleId = req.nextUrl.searchParams.get("femaleId");
  const all = req.nextUrl.searchParams.get("all");

  if (all === "true") return NextResponse.json(await getAllMatchRequests());
  if (maleId) {
    const matches = await getMatchRequests({ maleId });
    const mdRecs = await getMdRecsForMale(maleId);
    return NextResponse.json({ matches, mdRecs });
  }
  if (femaleId) {
    const matches = await getMatchRequests({ femaleId });
    return NextResponse.json(matches);
  }
  return NextResponse.json({ error: "maleId 또는 femaleId 필요" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { femaleProfileId, maleProfileIds } = await req.json();
  const db = await getDb();
  const created: string[] = [];

  const cooldownIds = await getCooldownMaleIds(femaleProfileId);

  for (const maleId of maleProfileIds) {
    if (cooldownIds.includes(maleId)) continue;

    const { error } = await db.from("match_requests").upsert(
      { female_profile_id: femaleProfileId, male_profile_id: maleId, status: "pending" },
      { onConflict: "female_profile_id,male_profile_id" },
    );
    if (!error) created.push(maleId);
  }

  await db.from("cart_items").delete().eq("female_profile_id", femaleProfileId);

  return NextResponse.json({ success: true, created });
}

export async function PATCH(req: NextRequest) {
  const { matchId, status } = await req.json();
  const db = await getDb();

  const { data: mr, error } = await db
    .from("match_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", matchId)
    .select()
    .single();

  if (error || !mr) return NextResponse.json({ error: "매칭 요청 없음" }, { status: 404 });

  if (status === "rejected") {
    await db.from("rejection_logs").upsert(
      { male_profile_id: mr.male_profile_id, female_profile_id: mr.female_profile_id, rejected_at: new Date().toISOString() },
      { onConflict: "male_profile_id,female_profile_id" },
    );
  }

  return NextResponse.json({
    success: true,
    match: {
      id: mr.id,
      femaleProfileId: mr.female_profile_id,
      maleProfileId: mr.male_profile_id,
      status: mr.status,
      requestedAt: mr.requested_at,
      respondedAt: mr.responded_at,
    },
  });
}
