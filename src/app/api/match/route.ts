import { NextRequest, NextResponse } from "next/server";
import {
  getAllMatchRequests,
  getMatchRequests,
  getMdRecsForMale,
  getDb,
  findExistingMatch,
} from "@/lib/db";
import { isVisibleNow } from "@/lib/visibility";

export const dynamic = "force-dynamic";

// ── 상태 전이 정책 ────────────────────────────────────────────────────
// 매칭 거절(rejected) 은 수락(approved) 으로만 번복 가능. (남성 측 7일 노출기간 내)
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
    const matches = allMatches.filter(isVisibleNow);
    const mdRecs = allMdRecs.filter((r) =>
      isVisibleNow({
        status: r.status,
        requestedAt: r.createdAt,
        respondedAt: r.respondedAt,
      }),
    );
    return NextResponse.json({ matches, mdRecs });
  }
  if (femaleId) {
    const matches = await getMatchRequests({ femaleId });
    return NextResponse.json(matches);
  }
  return NextResponse.json({ error: "maleId 또는 femaleId 필요" }, { status: 400 });
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/match
//   여성이 카트에 담긴 남성들에게 매칭요청을 일괄 전송.
//
// 영구 잠금 정책:
//   같은 (female, male) 쌍에 대해 이미 row 가 있으면 status 와 무관하게 차단.
//   - upsert 로 status 를 덮어쓰는 기존 동작은 매칭 데이터 손실의 원인이었음.
//   - 클라이언트는 created / blocked 을 받아서 UI 메시지 처리.
// ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { femaleProfileId, maleProfileIds } = (await req.json()) as {
    femaleProfileId: string;
    maleProfileIds: string[];
  };
  if (!femaleProfileId || !Array.isArray(maleProfileIds) || maleProfileIds.length === 0) {
    return NextResponse.json({ error: "femaleProfileId, maleProfileIds 필요" }, { status: 400 });
  }

  const db = await getDb();
  const created: string[] = [];
  const blocked: { maleId: string; reason: "pending" | "approved" | "rejected" }[] = [];

  for (const maleId of maleProfileIds) {
    // 1) 기존 (female, male) 매칭 이력 확인 - 있으면 영구 잠금
    const existing = await findExistingMatch(femaleProfileId, maleId);
    if (existing) {
      blocked.push({ maleId, reason: existing.status });
      continue;
    }

    // 2) 신규 row insert (upsert 금지)
    const { error } = await db.from("match_requests").insert({
      female_profile_id: femaleProfileId,
      male_profile_id: maleId,
      status: "pending",
    });
    if (!error) created.push(maleId);
    else {
      // 동시성으로 unique 충돌이 발생한 경우에도 절대 덮어쓰지 않음
      blocked.push({ maleId, reason: "pending" });
    }
  }

  // 카트는 처리 시도한 남성들만 비움 (잠긴 항목도 같이 정리)
  await db
    .from("cart_items")
    .delete()
    .eq("female_profile_id", femaleProfileId)
    .in("male_profile_id", maleProfileIds);

  return NextResponse.json({ success: true, created, blocked });
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
