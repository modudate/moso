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
  const { femaleProfileId, maleProfileId } = await req.json();
  await addCartItem(femaleProfileId, maleProfileId);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { femaleProfileId, maleProfileId, clearAll } = await req.json();
  if (clearAll) {
    const db = await getDb();
    await db.from("cart_items").delete().eq("female_profile_id", femaleProfileId);
  } else {
    await removeCartItem(femaleProfileId, maleProfileId);
  }
  return NextResponse.json({ success: true });
}
