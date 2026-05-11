import { NextRequest, NextResponse } from "next/server";
import { getAllMatchRequests, getMatchRequests, getMdRecsForMale, getCooldownMaleIds } from "@/lib/db";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// ── 노출 기간 정책 ────────────────────────────────────────────────────
// 남성 페이지에서 여성 카드가 노출되는 기간.
//   - pending  (응답 전)         : 매칭 요청일로부터 30일
//   - rejected (남성 거절, 번복 가능) : 응답일로부터 7일
//   - approved (남성 수락, 번복 불가) : 응답일로부터 7일
// 정책 변경 시 이 두 상수만 조정.
const PENDING_VISIBLE_DAYS = 30;
const RESPONDED_VISIBLE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type VisibleItem = { status: string; requestedAt: string; respondedAt?: string | null };

function isVisibleToMale(item: VisibleItem): boolean {
  const now = Date.now();
  if (item.status === "pending") {
    const t = new Date(item.requestedAt).getTime();
    return now - t <= PENDING_VISIBLE_DAYS * DAY_MS;
  }
  // approved / rejected 는 응답일 기준
  if (!item.respondedAt) return false;
  const t = new Date(item.respondedAt).getTime();
  return now - t <= RESPONDED_VISIBLE_DAYS * DAY_MS;
}

// ── 상태 전이 정책 ────────────────────────────────────────────────────
// 매칭 거절(rejected) 은 수락(approved) 으로만 번복 가능.
// 매칭 확정(approved) 은 어떤 상태로도 번복 불가.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected"],
  rejected: ["approved"],
  approved: [],
};

export async function GET(req: NextRequest) {
  const maleId = req.nextUrl.searchParams.get("maleId");
  const femaleId = req.nextUrl.searchParams.get("femaleId");
  const all = req.nextUrl.searchParams.get("all");

  if (all === "true") return NextResponse.json(await getAllMatchRequests());
  if (maleId) {
    const [allMatches, allMdRecs] = await Promise.all([
      getMatchRequests({ maleId }),
      getMdRecsForMale(maleId),
    ]);
    const matches = allMatches.filter(isVisibleToMale);
    const mdRecs = allMdRecs.filter((r) => isVisibleToMale({
      status: r.status,
      requestedAt: r.createdAt,
      respondedAt: r.respondedAt,
    }));
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
  const { matchId, status, source } = await req.json();

  if (!matchId || !status) {
    return NextResponse.json({ error: "matchId, status 필수" }, { status: 400 });
  }
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "허용되지 않는 status" }, { status: 400 });
  }

  const db = await getDb();
  const table = source === "md" ? "md_recommendations" : "match_requests";

  // 현재 상태 조회 후 전이 가능 여부 검증
  const { data: current, error: fetchErr } = await db
    .from(table)
    .select("*")
    .eq("id", matchId)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "매칭 요청 없음" }, { status: 404 });
  }

  const currentStatus = current.status as string;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(status)) {
    const reason =
      currentStatus === "approved"
        ? "이미 수락한 매칭은 번복할 수 없습니다."
        : currentStatus === "rejected" && status === "rejected"
        ? "이미 거절한 상태입니다."
        : "허용되지 않는 상태 변경입니다.";
    return NextResponse.json({ error: reason, currentStatus }, { status: 409 });
  }

  const { data: mr, error } = await db
    .from(table)
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", matchId)
    .select()
    .single();

  if (error || !mr) return NextResponse.json({ error: "매칭 요청 업데이트 실패" }, { status: 500 });

  // 거절 로그 처리:
  //  - 새로 rejected 가 되면 로그를 갱신 (visible_after = now + 7d 트리거)
  //  - rejected → approved 번복 시에는 여성 측 쿨타임 로그 제거
  if (status === "rejected") {
    await db.from("rejection_logs").upsert(
      { male_profile_id: mr.male_profile_id, female_profile_id: mr.female_profile_id, rejected_at: new Date().toISOString() },
      { onConflict: "male_profile_id,female_profile_id" },
    );
  } else if (status === "approved" && currentStatus === "rejected") {
    await db
      .from("rejection_logs")
      .delete()
      .eq("male_profile_id", mr.male_profile_id)
      .eq("female_profile_id", mr.female_profile_id);
  }

  return NextResponse.json({
    success: true,
    match: {
      id: mr.id,
      femaleProfileId: mr.female_profile_id,
      maleProfileId: mr.male_profile_id,
      status: mr.status,
      requestedAt: mr.requested_at ?? mr.created_at,
      respondedAt: mr.responded_at,
    },
  });
}
