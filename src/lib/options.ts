export const BIRTH_YEARS = Array.from({ length: 26 }, (_, i) => `${2006 - i}년`);

export const GENDERS = ["남자", "여자"] as const;

export const CITIES = ["서울", "경기", "인천", "그 외 지역"];

export const DISTRICTS: Record<string, string[]> = {
  서울: ["동부", "서부", "남부", "북부"],
  경기: ["동부", "서부", "남부", "북부"],
  인천: [],
  "그 외 지역": [],
};

export const EDUCATIONS = [
  "박사 졸업",
  "석사 졸업",
  "SKY카포 졸업",
  "의대,치대,한의대,약대 졸업",
  "로스쿨,경찰대,사관학교 졸업",
  "해외대학교 졸업",
  "서울 4년제 졸업",
  "기타 4년제 졸업",
  "전문대학교 졸업",
  "고등학교 졸업",
];

export const JOB_TYPES = [
  "전문직",
  "대기업",
  "중견기업",
  "중소기업",
  "공기업",
  "공무원",
  "개인사업/자영업",
  "프리랜서",
];

export const SALARIES = [
  "~ 3,000만원 미만",
  "3,000만원 이상 ~ 4,000만원 미만",
  "4,000만원 이상 ~ 6,000만원 미만",
  "6,000만원 이상 ~ 8,000만원 미만",
  "8,000만원 이상 ~ 1억원 미만",
  "1억원 이상 ~ 1억 5천 미만",
  "1억 5천 이상 ~ 2억 미만",
  "2억 이상 ~",
  "3억 이상 ~",
];

export const SMOKING = ["흡연(연초)", "흡연(전자담배)", "비흡연"];

export const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
];

export const PRIORITIES = [
  "키",
  "나이",
  "거주지",
  "학력",
  "흡연 여부",
  "직업 형태",
  "연봉",
];

export function regionLabel(city: string, district: string) {
  if (!district) return city;
  return `${city} ${district}`;
}
