import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  addMatchRequest, getMatchRequests, getMatchesForUser, getMatchesByFrom,
  updateMatchAction, clearCart, isRejectionCooldown,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const toUserId = req.nextUrl.searchParams.get("toUserId");
  const fromUserId = req.nextUrl.searchParams.get("fromUserId");
  const all = req.nextUrl.searchParams.get("all");
  if (all === "true") return NextResponse.json(getMatchRequests());
  if (toUserId) return NextResponse.json(getMatchesForUser(toUserId));
  if (fromUserId) return NextResponse.json(getMatchesByFrom(fromUserId));
  return NextResponse.json({ error: "toUserId 또는 fromUserId 필요" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { fromUserId, targetIds } = await req.json();
  const created: string[] = [];
  for (const toUserId of targetIds) {
    if (isRejectionCooldown(fromUserId, toUserId)) continue;
    addMatchRequest({
      id: uuidv4(),
      fromUserId,
      toUserId,
      action: "pending",
      createdAt: new Date().toISOString(),
      rejectedAt: null,
    });
    created.push(toUserId);
  }
  clearCart(fromUserId);
  return NextResponse.json({ success: true, created });
}

export async function PATCH(req: NextRequest) {
  const { matchId, action } = await req.json();
  const mr = updateMatchAction(matchId, action);
  if (!mr) return NextResponse.json({ error: "매칭 요청 없음" }, { status: 404 });
  return NextResponse.json({ success: true, match: mr });
}
