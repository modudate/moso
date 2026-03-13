import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, addUser } from "@/lib/store";
import { User } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "login") {
    const { email, password } = body;
    const user = getUserByEmail(email);
    if (!user || user.password !== password) {
      return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
    if (user.status === "pending") {
      return NextResponse.json({ error: "승인 대기 중입니다. 관리자 승인 후 이용 가능합니다." }, { status: 403 });
    }
    if (user.status === "rejected") {
      return NextResponse.json({ error: "가입이 반려되었습니다." }, { status: 403 });
    }
    if (user.blocked) {
      return NextResponse.json({ error: "계정이 차단되었습니다. 관리자에게 문의하세요." }, { status: 403 });
    }
    return NextResponse.json({ success: true, user });
  }

  if (action === "register") {
    const { email, password } = body;
    if (getUserByEmail(email)) {
      return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 409 });
    }
    const newUser: User = {
      id: uuidv4(),
      email,
      password,
      gender: body.gender || "남자",
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: null,
      blocked: false,
      imageUrl: body.image || "",
      name: body.name || "",
      birthYear: body.birthYear || "",
      city: body.city || "",
      district: body.district || "",
      education: body.education || "",
      height: body.height || "",
      job: body.job || "",
      jobType: body.jobType || "",
      salary: body.salary || "",
      smoking: body.smoking || "",
      mbti: body.mbti || "",
      charm: body.charm || "",
      datingStyle: body.datingStyle || "",
      phone: body.phone || "",
      idealHeight: body.idealHeight || "",
      idealAge: body.idealAge || "",
      idealCity: body.idealCity || "",
      idealDistrict: body.idealDistrict || "",
      idealSmoking: body.idealSmoking || "",
      idealEducation: body.idealEducation || "",
      idealJobType: body.idealJobType || "",
      idealSalary: body.idealSalary || "",
      priority: body.priority || "",
    };
    addUser(newUser);
    return NextResponse.json({ success: true, message: "회원가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다." });
  }

  return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
}
