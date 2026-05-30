import { NextRequest, NextResponse } from "next/server";
import { getMdRecById, updateMdProgress } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// POST /api/admin/md-progress
//   MD추천(남성 선픽) 진행 단계를 관리자가 버튼으로 기록.
//   action: "link_sent" | "female_approve" | "female_reject" | "complete"
//
// 단계 흐름: (남성 수락) → link_sent → female_approve / female_reject → complete
// 권한: 관리자만
// Body: { mdId: string, action: string }
type Action = "link_sent" | "female_approve" | "female_reject" | "complete";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { mdId, action } = (await req.json()) as { mdId?: string; action?: Action };
  if (!mdId || !action) {
    return NextResponse.json({ error: "mdId, action 필수" }, { status: 400 });
  }

  const md = await getMdRecById(mdId);
  if (!md) {
    return NextResponse.json({ error: "MD추천을 찾을 수 없습니다." }, { status: 404 });
  }
  if (md.status !== "approved") {
    return NextResponse.json(
      { error: "남성이 수락한 MD추천만 진행 처리할 수 있습니다." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  switch (action) {
    case "link_sent": {
      if (md.linkSentAt) {
        return NextResponse.json({ error: "이미 링크전달 완료된 건입니다." }, { status: 409 });
      }
      const updated = await updateMdProgress(mdId, { link_sent_at: now });
      return NextResponse.json({ success: true, mdRec: updated });
    }
    case "female_approve":
    case "female_reject": {
      if (!md.linkSentAt) {
        return NextResponse.json(
          { error: "링크전달 완료 후 여성 응답을 기록할 수 있습니다." },
          { status: 409 },
        );
      }
      if (md.femaleApprovedAt || md.femaleRejectedAt) {
        return NextResponse.json({ error: "이미 여성 응답이 기록된 건입니다." }, { status: 409 });
      }
      const patch =
        action === "female_approve"
          ? { female_approved_at: now }
          : { female_rejected_at: now };
      const updated = await updateMdProgress(mdId, patch);
      return NextResponse.json({ success: true, mdRec: updated });
    }
    case "complete": {
      if (!md.femaleApprovedAt) {
        return NextResponse.json(
          { error: "여성수락 처리 후 매칭완료할 수 있습니다." },
          { status: 409 },
        );
      }
      if (md.completedAt) {
        return NextResponse.json({ error: "이미 매칭완료된 건입니다." }, { status: 409 });
      }
      const updated = await updateMdProgress(mdId, { completed_at: now });
      return NextResponse.json({ success: true, mdRec: updated });
    }
    default:
      return NextResponse.json({ error: "허용되지 않는 action" }, { status: 400 });
  }
}
