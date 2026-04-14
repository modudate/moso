import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import sharp from "sharp";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "profile-photos";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string; // "photo" | "charm" | "date"

  if (!file) {
    return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "JPEG, PNG, WebP만 업로드 가능합니다" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const processed = await sharp(buffer)
    .rotate()
    .resize(1200, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 2 })
    .toBuffer();

  const fileName = `${user.id}/${category}-${nanoid()}.webp`;

  const serviceClient = await createServiceClient();
  const { error: uploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(fileName, processed, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Signed URL 생성 (1시간)
  const { data: urlData } = await serviceClient.storage
    .from(BUCKET)
    .createSignedUrl(fileName, 3600);

  return NextResponse.json({
    success: true,
    path: fileName,
    signedUrl: urlData?.signedUrl || "",
  });
}
