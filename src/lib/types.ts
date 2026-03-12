export interface Profile {
  id: string;
  createdAt: string;
  blocked: boolean;
  imageUrl: string;
  name: string;
  birthYear: string;
  birthYearRange: string;
  gender: string;
  region: string;
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
  idealRegion: string;
  idealSmoking: string;
  idealEducation: string;
  idealJobType: string;
  idealSalary: string;
  priority: string;
}

export interface ProfileLink {
  token: string;
  profileId: string;
  createdAt: string;
  expiresAt: string;
}
