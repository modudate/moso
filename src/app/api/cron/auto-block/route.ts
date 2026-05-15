import { NextRequest, NextResponse } from "next/server";
import { runAutoBlock } from "@/lib/db";

// CRON_SECRET 이 미설정이면 무조건 거부 (이전에는 통과시켜 누구나 호출 가능했던 보안 구멍)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET 환경변수가 설정되지 않아 cron 호출이 비활성화되었습니다." },
      { status: 503 },
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runAutoBlock();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
