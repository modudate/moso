import { NextRequest, NextResponse } from "next/server";
import {
  getMdRecsForMale,
  addMdRecommendation,
  deleteMdRecommendation,
  getAllMdRecommendations,
  isMdLocked,
} from "@/lib/db";
import { requireAdmin, requireUser, isAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const maleId = req.nextUrl.searchParams.get("maleId");
  if (maleId) {
    // 본인 (남성) 또는 관리자만
    const userAuth = await requireUser();
    if (!userAuth.ok) return userAuth.response;
    if (userAuth.userId !== maleId && !(await isAdmin(userAuth.userId))) {
      return NextResponse.json({ error: "본인 또는 관리자만 조회할 수 있습니다." }, { status: 403 });
    }
    return NextResponse.json(await getMdRecsForMale(maleId));
  }
  // 전체 조회는 관리자만
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return NextResponse.json(await getAllMdRecommendations());
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { maleProfileId, femaleProfileId } = await req.json();
  if (!maleProfileId || !femaleProfileId) {
    return NextResponse.json({ error: "maleProfileId, femaleProfileId 필수" }, { status: 400 });
  }

  // 영구 잠금 검사
  //  - match_requests 또는 md_recommendations 에 (남, 여) row 가 이미 존재하면 차단
  //  - 정책: "응답(수락/거절) 받은 여성은 그 남성에게 영구 추천 불가"
  const lock = await isMdLocked(maleProfileId, femaleProfileId);
  if (lock.locked) {
    const msg =
      lock.reason === "match"
        ? lock.status === "approved"
          ? "이미 매칭이 확정된 여성입니다."
          : lock.status === "pending"
          ? "여성이 이미 매칭요청을 보냈습니다."
          : "이전에 매칭이 성사되지 않은 여성입니다. (재추천 불가)"
        : "이미 추천된 여성입니다.";
    return NextResponse.json({ error: msg, locked: true, reason: lock.reason, status: lock.status }, { status: 409 });
  }

  try {
    const md = await addMdRecommendation(maleProfileId, femaleProfileId);
    return NextResponse.json({ success: true, md });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  try {
    await deleteMdRecommendation(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
