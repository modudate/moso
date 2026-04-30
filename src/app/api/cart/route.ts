import { NextRequest, NextResponse } from "next/server";
import { getCartItems, addCartItem, removeCartItem, getDb } from "@/lib/db";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 서버에서 인증/검증 헬퍼
// - supabase auth 로 진짜 본인 ID 확인
// - users 테이블에 active 상태로 존재하는지 확인
//   (FK 위반/권한 우회 사전 차단)
async function resolveFemaleId(): Promise<
  | { ok: true; femaleId: string }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "정식 로그인 후 이용 가능합니다." };
  }
  const service = await createServiceClient();
  const { data: u } = await service
    .from("users")
    .select("id, role, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!u) {
    return {
      ok: false,
      status: 403,
      error: "회원가입이 완료되지 않은 계정입니다. 가입 후 이용해주세요.",
    };
  }
  if (u.status !== "active") {
    return {
      ok: false,
      status: 403,
      error: `현재 계정 상태(${u.status})로는 이용할 수 없습니다. 관리자에게 문의해주세요.`,
    };
  }
  if (u.role !== "female") {
    return {
      ok: false,
      status: 403,
      error: "여성 회원만 사용할 수 있는 기능입니다.",
    };
  }
  return { ok: true, femaleId: u.id };
}

export async function GET(req: NextRequest) {
  const femaleId = req.nextUrl.searchParams.get("femaleId");
  if (!femaleId) return NextResponse.json({ error: "femaleId 필요" }, { status: 400 });
  const items = await getCartItems(femaleId);
  // snake_case → camelCase 변환 (클라이언트 호환)
  const mapped = (items ?? []).map((item: Record<string, unknown>) => ({
    id: item.id,
    femaleProfileId: item.female_profile_id,
    maleProfileId: item.male_profile_id,
    addedAt: item.added_at,
  }));
  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveFemaleId();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { maleProfileId } = await req.json();
    if (!maleProfileId) {
      return NextResponse.json({ error: "maleProfileId 필요" }, { status: 400 });
    }
    await addCartItem(auth.femaleId, maleProfileId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "매칭 후보 추가 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await resolveFemaleId();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { maleProfileId, clearAll } = await req.json();
    if (clearAll) {
      const db = await getDb();
      const { error } = await db
        .from("cart_items")
        .delete()
        .eq("female_profile_id", auth.femaleId);
      if (error) throw new Error(error.message);
    } else {
      if (!maleProfileId) {
        return NextResponse.json({ error: "maleProfileId 필요" }, { status: 400 });
      }
      await removeCartItem(auth.femaleId, maleProfileId);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "매칭 후보 제거 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
