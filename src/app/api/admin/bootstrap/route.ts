import { NextResponse } from "next/server";
import {
  getAllUsers,
  getAllMatchRequests,
  getAllMdRecommendations,
  getAllIdealTypes,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";

// 서울 리전에서 실행되도록 고정 (vercel.json 과 일치)
export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

// 관리자 목록 페이지 초기 로드용 통합 엔드포인트.
// 기존 /api/profiles + /api/match?all=true + /api/md-recommendation 3 왕복을
// 1 왕복으로 묶어 TTFB 누적 비용을 크게 줄임.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [users, matches, mdRecs, idealTypes] = await Promise.all([
    getAllUsers(),
    getAllMatchRequests(),
    getAllMdRecommendations(),
    getAllIdealTypes(),
  ]);

  return NextResponse.json({ users, matches, mdRecs, idealTypes });
}
