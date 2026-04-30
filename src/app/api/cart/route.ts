import { NextRequest, NextResponse } from "next/server";
import { getCartItems, addCartItem, removeCartItem } from "@/lib/db";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const femaleId = req.nextUrl.searchParams.get("femaleId");
  if (!femaleId) return NextResponse.json({ error: "femaleId 필요" }, { status: 400 });
  const items = await getCartItems(femaleId);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const { femaleProfileId, maleProfileId } = await req.json();
    if (!femaleProfileId || !maleProfileId) {
      return NextResponse.json({ error: "femaleProfileId / maleProfileId 필요" }, { status: 400 });
    }
    await addCartItem(femaleProfileId, maleProfileId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "매칭 후보 추가 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { femaleProfileId, maleProfileId, clearAll } = await req.json();
    if (!femaleProfileId) {
      return NextResponse.json({ error: "femaleProfileId 필요" }, { status: 400 });
    }
    if (clearAll) {
      const db = await getDb();
      const { error } = await db.from("cart_items").delete().eq("female_profile_id", femaleProfileId);
      if (error) throw new Error(error.message);
    } else {
      if (!maleProfileId) {
        return NextResponse.json({ error: "maleProfileId 필요" }, { status: 400 });
      }
      await removeCartItem(femaleProfileId, maleProfileId);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "매칭 후보 제거 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
