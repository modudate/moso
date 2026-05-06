import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import sharp from "sharp";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "profile-photos";
const IS_DEV = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let uploaderId = user?.id;

  if (!uploaderId) {
    // 피드백용 미리보기 쿠키 사용자: 익명 폴더에 임시 업로드 허용
    // (실제 회원가입은 정식 로그인 후에만 진행되도록 /api/register 에서 별도 가드)
    const isPreview = req.cookies.get("preview_bypass")?.value === "1";
    if (IS_DEV) {
      uploaderId = "dev-anonymous";
    } else if (isPreview) {
      uploaderId = "preview-anonymous";
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
