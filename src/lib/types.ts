export type UserStatus = "pending" | "active" | "blocked" | "rejected";
export type Gender = "male" | "female";
export type MatchAction = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  phone: string;
  role: Gender;
  status: UserStatus;
  createdAt: string;

  realName: string;
  nickname: string;
  birthYear: number;
  height: number;
  city: string;
  district: string;
  workplace: string;
  job: string;
  workPattern: string;
  salary: string;
  education: string;
  smoking: boolean;
  mbti: string;
  charm: string;
  datingStyle: string;
  photoUrls: string[];
  charmPhoto: string | null;
  datePhoto: string | null;
  expiresAt: string | null;
  rejectionReason?: string | null;
}

export interface IdealType {
  userId: string;
  // 단일값(레거시) — 호환성을 위해 유지
  idealAge: string;
  // 다중 선택 — 신규
  idealAgeRanges: string[];
  idealMinHeight: number;
  idealMaxHeight: number;
  idealCities: string[];
  idealWorkplaces: string[];
  idealJobs: string[];
  idealSalaries: string[];
  idealEducation: string[];
  idealSmoking: boolean | null;
  idealMbti: string[];
  topPriorities: string[];
}

export interface MatchRequest {
  id: string;
  femaleProfileId: string;
  maleProfileId: string;
  status: MatchAction;
  requestedAt: string;
  respondedAt: string | null;
}

export interface CartItem {
  femaleProfileId: string;
  maleProfileId: string;
  addedAt: string;
}

export interface MdRecommendation {
  id: string;
  maleProfileId: string;
  femaleProfileId: string;
  status: MatchAction;
  createdAt: string;
  respondedAt: string | null;
}

export interface AdminNote {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileLink {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  maxAccess: number;
}

export interface RejectionLog {
  id: string;
  maleProfileId: string;
  femaleProfileId: string;
  rejectedAt: string;
  visibleAfter: string;
}
