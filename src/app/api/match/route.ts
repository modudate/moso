import { NextRequest, NextResponse } from "next/server";
import {
  getAllMatchRequests,
  getMatchRequests,
  getMdRecsForMale,
  getDb,
} from "@/lib/db";
import { isVisibleNow } from "@/lib/visibility";
import { requireAdmin, requireUser, requireActiveFemale, requireActiveMale, isAdmin } from "@/lib/auth-guard";
import { rateLimit, tooMany } from "@/lib/rate-limit";

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

  // ?all=true → 관리자 전용
  if (all === "true") {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    return NextResponse.json(await getAllMatchRequests());
  }

  // 로그인 필수 + 본인 ID 와 일치하거나 관리자만 허용
  const userAuth = await requireUser();
  if (!userAuth.ok) return userAuth.response;
  const admin = await isAdmin(userAuth.userId);

  if (maleId) {
    if (maleId !== userAuth.userId && !admin) {
      return NextResponse.json({ error: "본인 또는 관리자만 조회할 수 있습니다." }, { status: 403 });
    }
    const [allMatches, allMdRecs] = await Promise.all([
      getMatchRequests({ maleId }),
      getMdRecsForMale(maleId),
    ]);
    const matches = allMatches.filter(isVisibleNow);
    const mdRecs = allMdRecs.filter((r) => {
      // 관리자 진행 이벤트(여성수락/거절/매칭완료)가 있으면 그 시각 기준으로 7일 노출 연장
      const latestOutcome =
        [r.femaleRejectedAt, r.femaleApprovedAt, r.completedAt, r.respondedAt]
          .filter((x): x is string => !!x)
          .sort()
          .pop() ?? r.respondedAt;
      return isVisibleNow({
        status: r.status,
        requestedAt: r.createdAt,
        respondedAt: latestOutcome,
      });
    });
    return NextResponse.json({ matches, mdRecs });
  }

  if (femaleId) {
    if (femaleId !== userAuth.userId && !admin) {
      return NextResponse.json({ error: "본인 또는 관리자만 조회할 수 있습니다." }, { status: 403 });
    }
    const matches = await getMatchRequests({ femaleId });
    return NextResponse.json(matches);
  }

  return NextResponse.json({ error: "maleId 또는 femaleId 필요" }, { status: 400 });
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/match
//   여성이 카트에 담긴 남성들에게 매칭요청을 일괄 전송.
//
// 권한: active 여성 본인만 (femaleProfileId 는 본인 ID 와 일치해야 함)
// 영구 잠금: 같은 (female, male) 쌍에 row 있으면 status 무관 차단
// ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireActiveFemale();
  if (!auth.ok) return auth.response;

  // 매칭요청 일괄 전송 연타 방어 — 본인(userId) 기준 분당 20회
  const rl = rateLimit(`match:${auth.userId}`, 20, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { femaleProfileId, maleProfileIds } = (await req.json()) as {
    femaleProfileId: string;
    maleProfileIds: string[];
  };
  if (!femaleProfileId || !Array.isArray(maleProfileIds) || maleProfileIds.length === 0) {
    return NextResponse.json({ error: "femaleProfileId, maleProfileIds 필요" }, { status: 400 });
  }
  if (femaleProfileId !== auth.userId) {
    return NextResponse.json({ error: "본인 ID 로만 매칭요청을 보낼 수 있습니다." }, { status: 403 });
  }

  const db = await getDb();
  const created: string[] = [];
  const blocked: { maleId: string; reason: "pending" | "approved" | "rejected" }[] = [];

  // 기존 매칭 이력을 한 번의 쿼리로 조회 (기존 maleId 마다 1쿼리씩 돌던 N+1 제거)
  const { data: existingRows } = await db
    .from("match_requests")
    .select("male_profile_id, status")
    .eq("female_profile_id", femaleProfileId)
    .in("male_profile_id", maleProfileIds);
  const existingStatus = new Map<string, "pending" | "approved" | "rejected">(
    (existingRows || []).map((r) => [
      r.male_profile_id as string,
      r.status as "pending" | "approved" | "rejected",
    ]),
  );

  const toInsert: string[] = [];
  for (const maleId of maleProfileIds) {
    const st = existingStatus.get(maleId);
    if (st) blocked.push({ maleId, reason: st });
    else toInsert.push(maleId);
  }

  if (toInsert.length > 0) {
    // 일괄 insert (가장 빠른 경로)
    const { data: inserted, error } = await db
      .from("match_requests")
      .insert(
        toInsert.map((maleId) => ({
          female_profile_id: femaleProfileId,
          male_profile_id: maleId,
          status: "pending",
        })),
      )
      .select("male_profile_id");

    if (!error && inserted) {
      for (const r of inserted) created.push(r.male_profile_id as string);
    } else {
      // 동시성으로 일부 UNIQUE 충돌 시 배열 insert 는 전체 롤백되므로,
      // 개별 insert 로 폴백하여 가능한 건만 생성한다.
      for (const maleId of toInsert) {
        const { error: e2 } = await db.from("match_requests").insert({
          female_profile_id: femaleProfileId,
          male_profile_id: maleId,
          status: "pending",
        });
        if (!e2) created.push(maleId);
        else blocked.push({ maleId, reason: "pending" });
      }
    }
  }

  await db
    .from("cart_items")
    .delete()
    .eq("female_profile_id", femaleProfileId)
    .in("male_profile_id", maleProfileIds);

  return NextResponse.json({ success: true, created, blocked });
}

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/match
//   남성이 자신에게 들어온 매칭요청 / MD 추천에 응답.
//
// 권한: active 남성 본인만 (matchId 의 male_profile_id 가 본인 id 와 일치해야 함)
// ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const auth = await requireActiveMale();
  if (!auth.ok) return auth.response;

  const { matchId, status, source } = await req.json();

  if (!matchId || !status) {
    return NextResponse.json({ error: "matchId, status 필수" }, { status: 400 });
  }
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "허용되지 않는 status" }, { status: 400 });
  }

  const db = await getDb();
  const table = source === "md" ? "md_recommendations" : "match_requests";

  // 현재 상태 조회 + 본인 매칭인지 검증
  const { data: current, error: fetchErr } = await db
    .from(table)
    .select("*")
    .eq("id", matchId)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "매칭 요청 없음" }, { status: 404 });
  }
  if (current.male_profile_id !== auth.userId) {
    return NextResponse.json({ error: "본인의 매칭만 응답할 수 있습니다." }, { status: 403 });
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
