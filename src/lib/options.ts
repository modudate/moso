export const BIRTH_YEARS = [
  "~2007년",
  ...Array.from({ length: 27 }, (_, i) => `${2006 - i}년`),
  "1980년~",
];

export const GENDERS = ["남", "여"] as const;

export const CITIES = ["서울", "경기", "인천", "그 외 지역"];

export const DISTRICTS: Record<string, string[]> = {
  서울: ["동부", "서부", "남부", "북부"],
  경기: ["동부", "서부", "남부", "북부"],
  인천: [],
  "그 외 지역": [],
};

export const EDUCATIONS = [
  "대학원 졸업(박사)",
  "대학원 졸업(석사)",
  "4년제 대학 졸업",
  "전문대 졸업",
  "고등학교 졸업",
  "비공개",
];

export const WORKPLACES = [
  "대기업",
  "중견기업",
  "중소기업",
  "스타트업",
  "공기업 / 공공기관",
  "공무원",
  "전문직",
  "개인사업자 / 자영업",
  "프리랜서",
  "학생 / 취업준비생",
  "기타",
];

const CORP_JOBS = [
  "기획/전략", "마케팅/광고/브랜딩", "영업/BD", "인사/HR", "재무/회계/금융",
  "개발자 (백엔드/프론트/앱)", "데이터/AI/분석", "엔지니어 (기계/전기/반도체/생산)",
  "디자인 (UXUI/그래픽/제품)", "운영/PM/PO", "구매/물류/SCM", "연구직/R&D",
  "고객관리/CS", "기타 사무직",
];

export const JOBS: Record<string, string[]> = {
  "대기업": CORP_JOBS,
  "중견기업": CORP_JOBS,
  "중소기업": CORP_JOBS,
  "스타트업": CORP_JOBS,
  "공기업 / 공공기관": [
    "행정직", "기술직 (엔지니어)", "연구직", "금융/회계", "운영/관리", "기타",
  ],
  "공무원": [
    "행정직", "기술직", "경찰", "소방관", "군인", "교육직 (교사/교수)", "기타",
  ],
  "전문직": [
    "의사", "치과의사", "한의사", "수의사", "약사",
    "변호사", "변리사", "감정평가사", "회계사", "세무사", "관세사", "노무사",
  ],
  "개인사업자 / 자영업": [
    "외식업", "카페/디저트", "쇼핑몰/이커머스", "뷰티/미용",
    "헬스/피트니스", "교육/학원", "제조업", "기타 서비스업",
  ],
  "프리랜서": [
    "개발", "디자인", "마케팅/콘텐츠", "영상/촬영",
    "작가/크리에이터", "강사/교육", "기타",
  ],
  "학생 / 취업준비생": [
    "대학생", "대학원생", "취업준비생",
  ],
  "기타": [
    "기타",
  ],
};

export const WORK_PATTERNS = [
  "일반 직장인 패턴",
  "유연 근무",
  "교대 근무",
  "야간 근무 위주",
  "주말 근무 많음",
  "기타",
];

export const SALARIES = [
  "3,000 이하",
  "3,000 ~ 4,000만원",
  "4,000 ~ 6,000만원",
  "6,000 ~ 8,000만원",
  "8,000 ~ 1억원",
  "1억 ~ 1억 5천",
  "1억 5천 ~ 2억",
  "2억 ~ 5억원",
  "5억원 이상",
  "비공개",
];

export const SMOKING_OPTIONS = ["유", "무"] as const;

export const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
  "잘 모르겠어요",
];

export const HEIGHT_RANGES = [
  "130~155", "156~160", "161~165", "166~170",
  "171~175", "176~180", "181~185", "185~230",
];

export const AGE_RANGES = [
  "~2007년",
  "2006년~1997년",
  "1996년~1994년",
  "1993년~1990년",
  "1989년~1987년",
  "1986년~1984년",
  "1983년~1981년",
  "1980년~",
];

export const TOP_PRIORITIES = [
  "출생년도",
  "키",
  "거주지",
  "흡연",
  "MBTI",
  "학력",
  "직장",
  "연봉",
];

export const FILTER_ITEMS = [
  { key: "birthYear", label: "출생년도", options: AGE_RANGES },
  { key: "height", label: "키", options: HEIGHT_RANGES },
  { key: "city", label: "거주지", options: CITIES },
  { key: "smoking", label: "흡연여부", options: SMOKING_OPTIONS as unknown as string[] },
  { key: "mbti", label: "MBTI", options: MBTI_TYPES },
  { key: "education", label: "학력", options: EDUCATIONS },
  { key: "workplace", label: "직장", options: WORKPLACES },
];

export function regionLabel(city: string, district: string) {
  if (!district) return city;
  return `${city} ${district}`;
}

export function smokingLabel(v: boolean) {
  return v ? "유" : "무";
}
