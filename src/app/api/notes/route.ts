import { NextRequest, NextResponse } from "next/server";
import { addAdminNote } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId, content } = await req.json();
  if (!userId || !content?.trim()) {
    return NextResponse.json({ error: "userId, content 필수" }, { status: 400 });
  }

  try {
    const note = await addAdminNote(userId, content.trim());
    return NextResponse.json({
      success: true,
      note: {
        id: note.id,
        userId: note.user_id,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
