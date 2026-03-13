export type UserStatus = "pending" | "approved" | "rejected" | "blocked";
export type Gender = "남자" | "여자";
export type MatchAction = "pending" | "accepted" | "rejected";

export interface User {
  id: string;
  email: string;
  password: string;
  gender: Gender;
  status: UserStatus;
  createdAt: string;
  expiresAt: string | null;
  blocked: boolean;
  imageUrl: string;
  name: string;
  birthYear: string;
  city: string;
  district: string;
  education: string;
  height: string;
  job: string;
  jobType: string;
  salary: string;
  smoking: string;
  mbti: string;
  charm: string;
  datingStyle: string;
  phone: string;
  idealHeight: string;
  idealAge: string;
  idealCity: string;
  idealDistrict: string;
  idealSmoking: string;
  idealEducation: string;
  idealJobType: string;
  idealSalary: string;
  priority: string;
}

export interface MatchRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  action: MatchAction;
  createdAt: string;
  rejectedAt: string | null;
}

export interface CartItem {
  userId: string;
  targetId: string;
  addedAt: string;
}

export interface ProfileLink {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}
