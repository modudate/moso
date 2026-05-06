import { User, IdealType, MatchRequest, CartItem, MdRecommendation, AdminNote, ProfileLink, RejectionLog } from "./types";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const W1 = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop";
const W2 = "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop";
const W3 = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop";
const W4 = "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop";
const M1 = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop";
const M2 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop";
const M3 = "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=500&fit=crop";
const M4 = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop";
const M5 = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop";

const C1 = "https://images.unsplash.com/photo-1516575334481-f85287c2c882?w=400&h=500&fit=crop";
const C2 = "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&h=500&fit=crop";
const C3 = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=500&fit=crop";
const C4 = "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=500&fit=crop";
const D1 = "https://images.unsplash.com/photo-1529543544282-ea98407407c0?w=400&h=500&fit=crop";
const D2 = "https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=400&h=500&fit=crop";
const D3 = "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=500&fit=crop";
const D4 = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=500&fit=crop";

const SEED_USERS: User[] = [
  // ── 여성 4명 (active) ──
  {
    id: "f-001", email: "jiwoo@test.com", phone: "010-1234-5678", role: "female", status: "active", createdAt: "2026-03-10T09:00:00.000Z",
    realName: "김지우", nickname: "지우", birthYear: 1997, height: 163, city: "서울", district: "서부",
    workplace: "대기업", job: "디자인 (UXUI/그래픽/제품)", workPattern: "일반 직장인 패턴", salary: "4,000 ~ 6,000만원",
    education: "4년제 대학 졸업", smoking: false, mbti: "ENFP",
    charm: "밝은 에너지와 공감 능력이 좋아요\n주말마다 새로운 카페를 찾아다니는 걸 좋아하고, 요즘은 드럼을 배우고 있어요",
    datingStyle: "매일 연락하고 주말마다 데이트하는 스타일\n서로의 취미를 공유하면서 함께 성장하는 관계를 원해요",
    photoUrls: [W1], charmPhoto: C1, datePhoto: D1, expiresAt: "2026-04-10T09:00:00.000Z",
  },
  {
    id: "f-002", email: "seoyeon@test.com", phone: "010-5555-6666", role: "female", status: "active", createdAt: "2026-03-12T08:15:00.000Z",
    realName: "이서연", nickname: "서연", birthYear: 1998, height: 158, city: "경기", district: "서부",
    workplace: "공기업 / 공공기관", job: "연구직", workPattern: "유연 근무", salary: "4,000 ~ 6,000만원",
    education: "대학원 졸업(석사)", smoking: false, mbti: "ISFJ",
    charm: "따뜻하고 배려심이 깊어요\n편지 쓰는 걸 좋아하고, 상대방의 작은 변화도 잘 알아차려요",
    datingStyle: "소소한 일상을 함께 나누는 스타일\n집에서 같이 영화 보거나 요리하는 걸 좋아해요",
    photoUrls: [W2], charmPhoto: C2, datePhoto: D2, expiresAt: "2026-04-12T08:15:00.000Z",
  },
  {
    id: "f-003", email: "yuna@test.com", phone: "010-7777-0000", role: "female", status: "active", createdAt: "2026-03-09T10:00:00.000Z",
    realName: "박유나", nickname: "유나", birthYear: 1996, height: 167, city: "서울", district: "남부",
    workplace: "전문직", job: "회계사", workPattern: "일반 직장인 패턴", salary: "6,000 ~ 8,000만원",
    education: "4년제 대학 졸업", smoking: false, mbti: "INTJ",
    charm: "논리적이고 독립적이에요\n혼자 여행도 잘 다니고, 와인과 재즈를 좋아해요",
    datingStyle: "서로의 공간을 존중하는 스타일\n바쁜 날에도 짧은 통화 한 번은 꼭 하고 싶어요",
    photoUrls: [W3], charmPhoto: C3, datePhoto: D3, expiresAt: "2026-04-09T10:00:00.000Z",
  },
  {
    id: "f-004", email: "minji@test.com", phone: "010-3333-7777", role: "female", status: "active", createdAt: "2026-03-11T11:00:00.000Z",
    realName: "최민지", nickname: "민지", birthYear: 1999, height: 161, city: "서울", district: "동부",
    workplace: "대기업", job: "마케팅/광고/브랜딩", workPattern: "일반 직장인 패턴", salary: "3,000 ~ 4,000만원",
    education: "4년제 대학 졸업", smoking: false, mbti: "ESFP",
    charm: "밝고 활발해서 분위기 메이커예요\n사진 찍는 걸 좋아하고 SNS에 맛집 기록하는 게 취미에요",
    datingStyle: "매일 보고 싶고 깜짝 이벤트를 좋아하는 스타일\n기념일을 중요하게 생각해요",
    photoUrls: [W4], charmPhoto: C4, datePhoto: D4, expiresAt: "2026-04-11T11:00:00.000Z",
  },

  // ── 남성 4명 (active) ──
  {
    id: "m-001", email: "hyunwoo@test.com", phone: "010-9876-5432", role: "male", status: "active", createdAt: "2026-03-11T14:30:00.000Z",
    realName: "박현우", nickname: "현우", birthYear: 1995, height: 178, city: "서울", district: "동부",
    workplace: "대기업", job: "재무/회계/금융", workPattern: "일반 직장인 패턴", salary: "6,000 ~ 8,000만원",
    education: "4년제 대학 졸업", smoking: false, mbti: "INTJ",
    charm: "차분하고 계획적인 성격이에요\n요리를 잘하고, 주말마다 헬스장에서 운동해요",
    datingStyle: "서로의 시간을 존중하면서 깊게 만나는 스타일\n진지한 대화를 나누는 걸 좋아해요",
    photoUrls: [M1], charmPhoto: C2, datePhoto: D3, expiresAt: "2026-04-11T14:30:00.000Z",
  },
  {
    id: "m-002", email: "junhyuk@test.com", phone: "010-1111-2222", role: "male", status: "active", createdAt: "2026-03-08T10:00:00.000Z",
    realName: "최준혁", nickname: "준혁", birthYear: 1993, height: 183, city: "서울", district: "남부",
    workplace: "전문직", job: "변호사", workPattern: "유연 근무", salary: "1억 ~ 1억 5천",
    education: "대학원 졸업(박사)", smoking: false, mbti: "ENTJ",
    charm: "목표 지향적이고 리더십이 강해요\n주말에는 등산이나 골프를 즐겨요",
    datingStyle: "함께 성장하는 관계를 추구해요\n서로 응원하고 자극을 주는 사이가 좋아요",
    photoUrls: [M2], charmPhoto: C3, datePhoto: D1, expiresAt: "2026-04-08T10:00:00.000Z",
  },
  {
    id: "m-003", email: "doyoon@test.com", phone: "010-2222-3333", role: "male", status: "active", createdAt: "2026-03-08T11:00:00.000Z",
    realName: "김도윤", nickname: "도윤", birthYear: 1996, height: 177, city: "서울", district: "서부",
    workplace: "대기업", job: "개발자 (백엔드/프론트/앱)", workPattern: "유연 근무", salary: "6,000 ~ 8,000만원",
    education: "4년제 대학 졸업", smoking: false, mbti: "INTP",
    charm: "유머 감각이 좋고 새로운 기술에 관심이 많아요\n게임이랑 보드게임을 좋아하고, 가끔 직접 앱을 만들어요",
    datingStyle: "편하게 대화 나누며 같이 취미 생활하는 스타일\n서로 간섭하지 않으면서도 든든한 관계가 좋아요",
    photoUrls: [M3], charmPhoto: C1, datePhoto: D4, expiresAt: "2026-04-08T11:00:00.000Z",
  },
  {
    id: "m-004", email: "minsu@test.com", phone: "010-3333-4444", role: "male", status: "active", createdAt: "2026-03-09T09:00:00.000Z",
    realName: "정민수", nickname: "민수", birthYear: 1994, height: 173, city: "경기", district: "동부",
    workplace: "중견기업", job: "연구직/R&D", workPattern: "일반 직장인 패턴", salary: "4,000 ~ 6,000만원",
    education: "대학원 졸업(석사)", smoking: false, mbti: "ISFP",
    charm: "감성적이고 음악을 좋아해요\n기타 연주가 가능하고, 가끔 작곡도 해요",
    datingStyle: "카페에서 조용히 시간 보내는 걸 좋아해요\n편안한 분위기에서 서로를 알아가는 게 좋아요",
    photoUrls: [M4], charmPhoto: C4, datePhoto: D2, expiresAt: "2026-04-09T09:00:00.000Z",
  },

  // ── 특수 케이스 ──
  // 매칭 0건 남성
  {
    id: "m-lonely", email: "lonely@test.com", phone: "010-1234-0000", role: "male", status: "active", createdAt: "2026-03-11T12:00:00.000Z",
    realName: "서진호", nickname: "진호", birthYear: 1995, height: 181, city: "서울", district: "서부",
    workplace: "대기업", job: "기획/전략", workPattern: "일반 직장인 패턴", salary: "6,000 ~ 8,000만원",
    education: "4년제 대학 졸업", smoking: false, mbti: "INFJ",
    charm: "깊은 대화를 좋아하고, 상대의 이야기에 진심으로 귀 기울여요",
    datingStyle: "카페에서 오래 이야기하고, 밤에 산책하는 스타일",
    photoUrls: [M5], charmPhoto: C3, datePhoto: D1, expiresAt: "2026-04-11T12:00:00.000Z",
  },
  // 승인대기 남성 (NEW)
  {
    id: "m-010", email: "newguy@test.com", phone: "010-9999-0000", role: "male", status: "pending", createdAt: new Date().toISOString(),
    realName: "신규남성", nickname: "새별", birthYear: 1996, height: 175, city: "서울", district: "서부",
    workplace: "중견기업", job: "마케팅/광고/브랜딩", workPattern: "일반 직장인 패턴", salary: "3,000 ~ 4,000만원",
    education: "4년제 대학 졸업", smoking: false, mbti: "ENFP",
    charm: "트렌드에 밝고 대화를 잘 이끌어가요", datingStyle: "깜짝 이벤트를 좋아하는 스타일",
    photoUrls: [M3], charmPhoto: null, datePhoto: null, expiresAt: null,
  },
  // 승인대기 여성 (NEW)
  {
    id: "f-006", email: "newgirl@test.com", phone: "010-6666-0000", role: "female", status: "pending", createdAt: new Date().toISOString(),
    realName: "신규여성", nickname: "하늘", birthYear: 1999, height: 161, city: "서울", district: "동부",
    workplace: "스타트업", job: "기획/전략", workPattern: "유연 근무", salary: "3,000 ~ 4,000만원",
    education: "4년제 대학 졸업", smoking: false, mbti: "ENFJ",
    charm: "소통을 잘하고 아이디어가 많아요", datingStyle: "함께 계획 세우는 걸 좋아해요",
    photoUrls: [W1], charmPhoto: null, datePhoto: null, expiresAt: null,
  },
  // 반려된 남성
  {
    id: "m-011", email: "rejected@test.com", phone: "010-0000-1111", role: "male", status: "rejected", createdAt: "2026-03-07T09:00:00.000Z",
    realName: "반려된남성", nickname: "그림자", birthYear: 1988, height: 170, city: "경기", district: "북부",
    workplace: "프리랜서", job: "기타", workPattern: "기타", salary: "3,000 이하",
    education: "고등학교 졸업", smoking: true, mbti: "ISTP",
    charm: "-", datingStyle: "-",
    photoUrls: [], charmPhoto: null, datePhoto: null, expiresAt: null,
  },
  // 차단된 남성
  {
    id: "m-012", email: "blocked@test.com", phone: "010-0000-2222", role: "male", status: "blocked", createdAt: "2026-02-15T09:00:00.000Z",
    realName: "차단된남성", nickname: "바람", birthYear: 1990, height: 176, city: "서울", district: "북부",
    workplace: "중견기업", job: "영업/BD", workPattern: "일반 직장인 패턴", salary: "6,000 ~ 8,000만원",
    education: "4년제 대학 졸업", smoking: true, mbti: "ESTP",
    charm: "넓은 인맥과 추진력", datingStyle: "적극적으로 다가가는 스타일",
    photoUrls: [M5], charmPhoto: null, datePhoto: null, expiresAt: "2026-03-15T09:00:00.000Z",
  },
  // 반려된 여성
  {
    id: "f-005", email: "rejectedgirl@test.com", phone: "010-8888-1111", role: "female", status: "rejected", createdAt: "2026-03-05T09:00:00.000Z",
    realName: "반려여성", nickname: "소리", birthYear: 2000, height: 160, city: "경기", district: "남부",
    workplace: "프리랜서", job: "디자인", workPattern: "유연 근무", salary: "3,000 이하",
    education: "전문대 졸업", smoking: false, mbti: "INFP",
    charm: "그림을 잘 그려요", datingStyle: "감성적인 데이트를 좋아해요",
    photoUrls: [], charmPhoto: null, datePhoto: null, expiresAt: null,
  },
  // 차단된 여성
  {
    id: "f-007", email: "blockedgirl@test.com", phone: "010-8888-2222", role: "female", status: "blocked", createdAt: "2026-02-20T09:00:00.000Z",
    realName: "차단여성", nickname: "달빛", birthYear: 1996, height: 162, city: "서울", district: "동부",
    workplace: "공기업 / 공공기관", job: "연구직", workPattern: "일반 직장인 패턴", salary: "3,000 ~ 4,000만원",
    education: "대학원 졸업(석사)", smoking: false, mbti: "ISFJ",
    charm: "차분하고 세심해요", datingStyle: "꾸준한 연락을 선호해요",
    photoUrls: [W2], charmPhoto: null, datePhoto: null, expiresAt: "2026-03-20T09:00:00.000Z",
  },
];

const SEED_IDEAL_TYPES: IdealType[] = [
  { userId: "f-001", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 176, idealMaxHeight: 180, idealCities: ["서울"], idealWorkplaces: ["대기업"], idealJobs: [], idealSalaries: ["6,000 ~ 8,000만원"], idealEducation: ["4년제 대학 졸업"], idealSmoking: false, idealMbti: [], topPriorities: ["키", "직장", "연봉", "학력"] },
  { userId: "f-002", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 171, idealMaxHeight: 175, idealCities: ["경기"], idealWorkplaces: ["중견기업"], idealJobs: [], idealSalaries: ["4,000 ~ 6,000만원"], idealEducation: ["대학원 졸업(석사)"], idealSmoking: false, idealMbti: [], topPriorities: ["학력", "흡연", "거주지", "연봉"] },
  { userId: "f-003", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 176, idealMaxHeight: 180, idealCities: ["서울"], idealWorkplaces: ["전문직"], idealJobs: [], idealSalaries: ["8,000 ~ 1억원"], idealEducation: ["4년제 대학 졸업"], idealSmoking: false, idealMbti: [], topPriorities: ["연봉", "학력", "키", "직장"] },
  { userId: "f-004", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 176, idealMaxHeight: 185, idealCities: ["서울"], idealWorkplaces: ["대기업", "전문직"], idealJobs: [], idealSalaries: ["4,000 ~ 6,000만원"], idealEducation: ["4년제 대학 졸업"], idealSmoking: false, idealMbti: ["ENFJ", "ENTJ", "INTJ"], topPriorities: ["MBTI", "키", "직장", "거주지"] },
  // ── 남성 이상형 ──
  { userId: "m-001", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 158, idealMaxHeight: 170, idealCities: ["서울"], idealWorkplaces: ["대기업", "공기업 / 공공기관"], idealJobs: [], idealSalaries: ["4,000 ~ 6,000만원"], idealEducation: ["4년제 대학 졸업", "대학원 졸업(석사)"], idealSmoking: false, idealMbti: ["ENFP", "INFJ"], topPriorities: ["키", "학력", "거주지", "흡연"] },
  { userId: "m-002", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 160, idealMaxHeight: 172, idealCities: ["서울", "경기"], idealWorkplaces: ["전문직"], idealJobs: [], idealSalaries: ["6,000 ~ 8,000만원"], idealEducation: ["4년제 대학 졸업"], idealSmoking: false, idealMbti: [], topPriorities: ["연봉", "학력", "직장", "키"] },
  { userId: "m-003", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 155, idealMaxHeight: 165, idealCities: ["서울"], idealWorkplaces: ["대기업", "중견기업"], idealJobs: [], idealSalaries: ["3,000 ~ 4,000만원"], idealEducation: ["4년제 대학 졸업"], idealSmoking: false, idealMbti: ["ESFP", "ENFP", "ISFJ"], topPriorities: ["MBTI", "거주지", "흡연", "키"] },
  { userId: "m-004", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 156, idealMaxHeight: 168, idealCities: ["경기", "서울"], idealWorkplaces: ["공기업 / 공공기관", "대기업"], idealJobs: [], idealSalaries: ["4,000 ~ 6,000만원"], idealEducation: ["대학원 졸업(석사)", "4년제 대학 졸업"], idealSmoking: false, idealMbti: [], topPriorities: ["학력", "거주지", "연봉", "직장"] },
  { userId: "m-lonely", idealAge: "1996년~1994년", idealAgeRanges: ["1996년~1994년"], idealMinHeight: 160, idealMaxHeight: 175, idealCities: ["서울"], idealWorkplaces: ["대기업", "전문직", "공기업 / 공공기관"], idealJobs: [], idealSalaries: ["4,000 ~ 6,000만원"], idealEducation: ["4년제 대학 졸업"], idealSmoking: false, idealMbti: ["ENFP", "ISFJ", "ESFJ"], topPriorities: ["키", "MBTI", "학력", "거주지"] },
];

const SEED_MATCH_REQUESTS: MatchRequest[] = [
  { id: "mr-001", femaleProfileId: "f-001", maleProfileId: "m-001", status: "approved", requestedAt: "2026-03-11T15:00:00.000Z", respondedAt: "2026-03-11T16:00:00.000Z" },
  { id: "mr-002", femaleProfileId: "f-001", maleProfileId: "m-002", status: "pending", requestedAt: "2026-03-12T10:00:00.000Z", respondedAt: null },
  { id: "mr-003", femaleProfileId: "f-001", maleProfileId: "m-003", status: "rejected", requestedAt: "2026-03-10T12:00:00.000Z", respondedAt: "2026-03-11T09:00:00.000Z" },
  { id: "mr-004", femaleProfileId: "f-002", maleProfileId: "m-004", status: "approved", requestedAt: "2026-03-10T16:00:00.000Z", respondedAt: "2026-03-10T17:00:00.000Z" },
  { id: "mr-005", femaleProfileId: "f-002", maleProfileId: "m-001", status: "pending", requestedAt: "2026-03-12T11:00:00.000Z", respondedAt: null },
  { id: "mr-006", femaleProfileId: "f-003", maleProfileId: "m-001", status: "pending", requestedAt: "2026-03-12T14:00:00.000Z", respondedAt: null },
  { id: "mr-007", femaleProfileId: "f-003", maleProfileId: "m-002", status: "pending", requestedAt: "2026-03-12T14:30:00.000Z", respondedAt: null },
  { id: "mr-008", femaleProfileId: "f-003", maleProfileId: "m-004", status: "approved", requestedAt: "2026-03-11T10:00:00.000Z", respondedAt: "2026-03-11T11:00:00.000Z" },
  { id: "mr-009", femaleProfileId: "f-004", maleProfileId: "m-003", status: "pending", requestedAt: "2026-03-12T16:00:00.000Z", respondedAt: null },
];

const SEED_CART: CartItem[] = [
  { femaleProfileId: "f-001", maleProfileId: "m-004", addedAt: "2026-03-12T12:00:00.000Z" },
];

const SEED_REJECTION_LOGS: RejectionLog[] = [
  { id: "rl-001", maleProfileId: "m-003", femaleProfileId: "f-001", rejectedAt: "2026-03-11T09:00:00.000Z", visibleAfter: "2026-03-18T09:00:00.000Z" },
];

const SEED_MD_RECOMMENDATIONS: MdRecommendation[] = [
  { id: "md-001", maleProfileId: "m-lonely", femaleProfileId: "f-003", status: "pending", createdAt: "2026-03-12T16:00:00.000Z", respondedAt: null },
  { id: "md-002", maleProfileId: "m-001", femaleProfileId: "f-004", status: "pending", createdAt: "2026-03-13T10:00:00.000Z", respondedAt: null },
];

const SEED_ADMIN_NOTES: AdminNote[] = [
  { id: "an-001", userId: "m-001", content: "우수 회원 - 매칭 성사율 높음", createdAt: "2026-03-12T10:00:00.000Z", updatedAt: "2026-03-12T10:00:00.000Z" },
  { id: "an-002", userId: "f-001", content: "적극적인 회원, 매칭 요청 빠름", createdAt: "2026-03-12T10:30:00.000Z", updatedAt: "2026-03-12T10:30:00.000Z" },
];

let users: User[] = [...SEED_USERS];
let idealTypes: IdealType[] = [...SEED_IDEAL_TYPES];
let matchRequests: MatchRequest[] = [...SEED_MATCH_REQUESTS];
let cartItems: CartItem[] = [...SEED_CART];
let rejectionLogs: RejectionLog[] = [...SEED_REJECTION_LOGS];
let mdRecommendations: MdRecommendation[] = [...SEED_MD_RECOMMENDATIONS];
let adminNotes: AdminNote[] = [...SEED_ADMIN_NOTES];
let profileLinks: ProfileLink[] = [];

// === Users ===
export function getUsers(): User[] { return users; }
export function getUser(id: string): User | undefined { return users.find((u) => u.id === id); }
export function getUserByEmail(email: string): User | undefined { return users.find((u) => u.email === email); }
export function addUser(user: User) { users.push(user); }
export function updateUser(id: string, updates: Partial<User>): User | undefined {
  const user = users.find((u) => u.id === id);
  if (user) Object.assign(user, updates);
  return user;
}

export function getActiveMales(): User[] {
  return users.filter((u) => u.role === "male" && u.status === "active");
}
export function getActiveFemales(): User[] {
  return users.filter((u) => u.role === "female" && u.status === "active");
}

// === Ideal Types ===
export function getIdealType(userId: string): IdealType | undefined {
  return idealTypes.find((it) => it.userId === userId);
}
export function addIdealType(it: IdealType) { idealTypes.push(it); }

// === Matches ===
export function getMatchRequests(): MatchRequest[] { return matchRequests; }
export function addMatchRequest(mr: MatchRequest) { matchRequests.push(mr); }
export function getMatchesForMale(maleProfileId: string): MatchRequest[] {
  return matchRequests.filter((m) => m.maleProfileId === maleProfileId);
}
export function getMatchesByFemale(femaleProfileId: string): MatchRequest[] {
  return matchRequests.filter((m) => m.femaleProfileId === femaleProfileId);
}
export function updateMatchStatus(id: string, status: MatchRequest["status"]): MatchRequest | undefined {
  const mr = matchRequests.find((m) => m.id === id);
  if (mr) {
    mr.status = status;
    mr.respondedAt = new Date().toISOString();
  }
  return mr;
}

// === Rejection Logs ===
export function getRejectionLogs(): RejectionLog[] { return rejectionLogs; }
export function addRejectionLog(log: RejectionLog) { rejectionLogs.push(log); }
export function isInCooldown(femaleProfileId: string, maleProfileId: string): boolean {
  return rejectionLogs.some(
    (rl) => rl.femaleProfileId === femaleProfileId && rl.maleProfileId === maleProfileId && new Date(rl.visibleAfter) > new Date()
  );
}
export function getCooldownMalesForFemale(femaleProfileId: string): string[] {
  return rejectionLogs
    .filter((rl) => rl.femaleProfileId === femaleProfileId && new Date(rl.visibleAfter) > new Date())
    .map((rl) => rl.maleProfileId);
}

// === Cart ===
export function getCart(femaleProfileId: string): CartItem[] { return cartItems.filter((c) => c.femaleProfileId === femaleProfileId); }
export function addToCart(item: CartItem) {
  if (!cartItems.find((c) => c.femaleProfileId === item.femaleProfileId && c.maleProfileId === item.maleProfileId)) {
    cartItems.push(item);
  }
}
export function removeFromCart(femaleProfileId: string, maleProfileId: string) {
  cartItems = cartItems.filter((c) => !(c.femaleProfileId === femaleProfileId && c.maleProfileId === maleProfileId));
}
export function clearCart(femaleProfileId: string) {
  cartItems = cartItems.filter((c) => c.femaleProfileId !== femaleProfileId);
}

// === MD Recommendations ===
export function getMdRecommendations(): MdRecommendation[] { return mdRecommendations; }
export function getMdRecsForMale(maleProfileId: string): MdRecommendation[] {
  return mdRecommendations.filter((md) => md.maleProfileId === maleProfileId);
}
export function getMdRecsCount(maleProfileId: string): number {
  return mdRecommendations.filter((md) => md.maleProfileId === maleProfileId).length;
}
export function addMdRecommendation(md: MdRecommendation) { mdRecommendations.push(md); }
export function updateMdStatus(id: string, status: MdRecommendation["status"]): MdRecommendation | undefined {
  const md = mdRecommendations.find((m) => m.id === id);
  if (md) { md.status = status; md.respondedAt = new Date().toISOString(); }
  return md;
}

// === Admin Notes ===
export function getAdminNotes(userId: string): AdminNote[] {
  return adminNotes.filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function addAdminNote(note: AdminNote) { adminNotes.push(note); }
export function updateAdminNote(id: string, content: string): AdminNote | undefined {
  const note = adminNotes.find((n) => n.id === id);
  if (note) { note.content = content; note.updatedAt = new Date().toISOString(); }
  return note;
}
export function deleteAdminNote(id: string) {
  adminNotes = adminNotes.filter((n) => n.id !== id);
}

// === Profile Links ===
export function addProfileLink(link: ProfileLink) { profileLinks.push(link); }
export function getProfileLinkByToken(token: string): ProfileLink | undefined {
  return profileLinks.find((l) => l.token === token);
}
export function incrementLinkAccess(token: string) {
  const link = profileLinks.find((l) => l.token === token);
  if (link) link.accessCount++;
}

// === Cron: auto-block expired users ===
export function runAutoBlock() {
  const now = new Date();
  for (const u of users) {
    if (u.expiresAt && u.status === "active" && new Date(u.expiresAt) < now) {
      u.status = "blocked";
    }
  }
}
