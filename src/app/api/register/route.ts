import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const service = await createServiceClient();
  const body = await req.json();

  const { data: existingUser } = await service
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existingUser) {
    return NextResponse.json({ error: "이미 가입된 계정입니다" }, { status: 409 });
  }

  // 사진 필수 검증 (클라이언트 우회 방지용 서버측 가드)
  const validPhotoUrls = Array.isArray(body.photoUrls)
    ? body.photoUrls.filter((u: unknown): u is string => typeof u === "string" && !!u && !u.startsWith("blob:"))
    : [];
  if (validPhotoUrls.length < 2) {
    return NextResponse.json({ error: "대표 사진을 최소 2장 등록해주세요" }, { status: 400 });
  }
  const validCharm =
    typeof body.charmPhotoUrl === "string" && !!body.charmPhotoUrl && !body.charmPhotoUrl.startsWith("blob:");
  if (!validCharm) {
    return NextResponse.json({ error: "'저의 매력은' 사진을 등록해주세요" }, { status: 400 });
  }
  const validDate =
    typeof body.datePhotoUrl === "string" && !!body.datePhotoUrl && !body.datePhotoUrl.startsWith("blob:");
  if (!validDate) {
    return NextResponse.json({ error: "'연인이 생기면' 사진을 등록해주세요" }, { status: 400 });
  }

  const role = body.gender === "남" ? "male" : "female";

  const { error: userError } = await service.from("users").insert({
    id: user.id,
    email: user.email,
    phone: body.phone,
    role,
    status: "pending",
  });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const { error: profileError } = await service.from("profiles").insert({
    user_id: user.id,
    real_name: body.realName,
    nickname: body.nickname,
    birth_year: parseInt(body.birthYear) || body.birthYear,
    height: parseInt(body.height) || body.height,
    city: body.city,
    district: body.district || "",
    workplace: body.workplace,
    job: body.job || body.workplace,
    work_pattern: body.workPattern,
    salary: body.salary,
    education: body.education,
    smoking: body.smoking === "유" || body.smoking === true,
    mbti: body.mbti,
    charm: body.charm || "",
    dating_style: body.datingStyle || "",
    photo_urls: Array.isArray(body.photoUrls)
      ? body.photoUrls.filter((u: unknown): u is string => typeof u === "string" && !!u && !u.startsWith("blob:"))
      : [],
    charm_photo: typeof body.charmPhotoUrl === "string" && !body.charmPhotoUrl.startsWith("blob:") ? body.charmPhotoUrl : null,
    date_photo: typeof body.datePhotoUrl === "string" && !body.datePhotoUrl.startsWith("blob:") ? body.datePhotoUrl : null,
  });

  if (profileError) {
    await service.from("users").delete().eq("id", user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (body.idealType) {
    const it = body.idealType;
    await service.from("ideal_types").insert({
      user_id: user.id,
      ideal_age_range: it.idealAge,
      min_height: parseInt(it.idealMinHeight) || it.idealMinHeight,
      max_height: parseInt(it.idealMaxHeight) || it.idealMaxHeight,
      cities: it.idealCities || [],
      workplaces: it.idealWorkplaces || [],
      jobs: it.idealJobs || [],
      salaries: it.idealSalaries || [],
      education: it.idealEducation || [],
      ideal_smoking: it.idealSmoking,
      ideal_mbti: it.idealMbti || [],
      top_priorities: it.topPriorities || [],
    });
  }

  return NextResponse.json({ success: true });
}
