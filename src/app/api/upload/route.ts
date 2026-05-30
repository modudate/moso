import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { rateLimit, getClientIp, tooMany } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "profile-photos";
const IS_DEV = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  // 이미지 처리(sharp)는 CPU 비용이 크므로 업로드 연타 방어 — IP 기준 분당 40회
  const rl = rateLimit(`upload:${getClientIp(req)}`, 40, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let uploaderId = user?.id;

  if (!uploaderId) {
    if (IS_DEV) {
      uploaderId = "dev-anonymous";
    } else {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string;

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

  const fileName = `${uploaderId}/${category}-${nanoid()}.webp`;

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

  const { data: publicData } = serviceClient.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return NextResponse.json({
    success: true,
    path: fileName,
    signedUrl: publicData?.publicUrl || "",
  });
}
