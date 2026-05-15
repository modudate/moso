import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getLockedMaleIdsForFemale } from "@/lib/db";

export const dynamic = "force-dynamic";

// 여성이 "이미 매칭 이력이 있는 남성 ID" 목록을 가져온다.
// 정책: 한 번이라도 매칭요청을 보낸 적이 있는 남성은 status 와 무관하게 영구 잠금.
//   - 갤러리에서 제외
//   - 카드의 하트 버튼 비활성화/숨김
//   - 카트 담기 / 일괄 매칭요청 모두 차단 (서버에서도 재검증)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ lockedMaleIds: [] });

  const service = await createServiceClient();
  const { data: u } = await service
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  // 여성/active 가 아니면 빈 배열 (남성이나 관리자 호출 시에는 의미 없음)
  if (!u || u.role !== "female") {
    return NextResponse.json({ lockedMaleIds: [] });
  }

  const set = await getLockedMaleIdsForFemale(user.id);
  return NextResponse.json({ lockedMaleIds: Array.from(set) });
}
