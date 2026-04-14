import { NextRequest, NextResponse } from "next/server";
import { getCart, addToCart, removeFromCart, clearCart } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const femaleId = req.nextUrl.searchParams.get("femaleId");
  if (!femaleId) return NextResponse.json({ error: "femaleId 필요" }, { status: 400 });
  return NextResponse.json(getCart(femaleId));
}

export async function POST(req: NextRequest) {
  const { femaleProfileId, maleProfileId } = await req.json();
  addToCart({ femaleProfileId, maleProfileId, addedAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { femaleProfileId, maleProfileId, clearAll } = await req.json();
  if (clearAll) clearCart(femaleProfileId);
  else removeFromCart(femaleProfileId, maleProfileId);
  return NextResponse.json({ success: true });
}
