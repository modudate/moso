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
    photo_urls: Array.isArray(body.photoUrls) ? body.photoUrls.filter(Boolean) : [],
    charm_photo: body.charmPhotoUrl || null,
    date_photo: body.datePhotoUrl || null,
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
