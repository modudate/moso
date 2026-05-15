import { NextRequest, NextResponse } from "next/server";
import { addAdminNote, updateAdminNote, deleteAdminNote } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

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

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id, content } = await req.json();
  if (!id || !content?.trim()) {
    return NextResponse.json({ error: "id, content 필수" }, { status: 400 });
  }

  try {
    const note = await updateAdminNote(id, content.trim());
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

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  try {
    await deleteAdminNote(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
