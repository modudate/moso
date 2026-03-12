import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { addProfile, getProfiles } from "@/lib/store";
import { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = getProfiles();
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const imageUrl = body.image || "";

  const profile: Profile = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    blocked: false,
    imageUrl,
    name: body.name || "",
    birthYear: body.birthYear || "",
    birthYearRange: body.birthYearRange || "",
    gender: body.gender || "",
    region: body.region || "",
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
    idealRegion: body.idealRegion || "",
    idealSmoking: body.idealSmoking || "",
    idealEducation: body.idealEducation || "",
    idealJobType: body.idealJobType || "",
    idealSalary: body.idealSalary || "",
    priority: body.priority || "",
  };

  addProfile(profile);
  return NextResponse.json({ success: true, id: profile.id });
}
