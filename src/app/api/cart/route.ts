import { NextRequest, NextResponse } from "next/server";
import { getCart, addToCart, removeFromCart, clearCart } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId 필요" }, { status: 400 });
  return NextResponse.json(getCart(userId));
}

export async function POST(req: NextRequest) {
  const { userId, targetId } = await req.json();
  addToCart({ userId, targetId, addedAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, targetId, clearAll } = await req.json();
  if (clearAll) clearCart(userId);
  else removeFromCart(userId, targetId);
  return NextResponse.json({ success: true });
}
