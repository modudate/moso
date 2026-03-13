# OURMO 데이터베이스 설계

> ORM: **Prisma** | DB: **Supabase (PostgreSQL)** | Framework: **Next.js**

---

## 1. ER 다이어그램 (관계도)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │  match_requests   │       │  cart_items   │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │◄──┐   │ id (PK)          │       │ id (PK)      │
│ email        │   ├──│ from_user_id (FK) │       │ user_id (FK) │──► users.id
│ password     │   ├──│ to_user_id (FK)   │       │ target_id(FK)│──► users.id
│ gender       │   │   │ action            │       │ added_at     │
│ status       │   │   │ created_at        │       └──────────────┘
│ role         │   │   │ rejected_at       │
│ ...          │   │   └──────────────────┘
│              │   │
│              │   │   ┌──────────────────┐
│              │   │   │  profile_links    │
│              │   │   ├──────────────────┤
│              │   └──│ user_id (FK)      │
│              │       │ token (PK/UQ)     │
│              │       │ created_at        │
└──────────────┘       │ expires_at        │
       │               └──────────────────┘
       │
       ▼
┌──────────────┐
│ ideal_types  │  (1:1)
├──────────────┤
│ id (PK)      │
│ user_id (FK) │──► users.id (UNIQUE)
│ height       │
│ age_range    │
│ city         │
│ district     │
│ smoking      │
│ education    │
│ job_type     │
│ salary       │
│ priority     │
└──────────────┘
```

---

## 2. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Supabase pooling 대응
}

// ──────────────────────────────────────
// ENUMS
// ──────────────────────────────────────

enum Gender {
  MALE
  FEMALE
}

enum UserStatus {
  PENDING   // 가입 후 승인 대기
  APPROVED  // 관리자 승인됨
  REJECTED  // 관리자 반려됨
}

enum UserRole {
  USER
  ADMIN
}

enum MatchAction {
  PENDING   // 여성이 요청, 남성 미응답
  ACCEPTED  // 남성 수락 (매칭 확정)
  REJECTED  // 남성 거절
}

// ──────────────────────────────────────
// USERS
// ──────────────────────────────────────

model User {
  id        String     @id @default(uuid())
  email     String     @unique
  password  String     // 실서비스 시 bcrypt 해시
  gender    Gender
  role      UserRole   @default(USER)
  status    UserStatus @default(PENDING)
  blocked   Boolean    @default(false)

  // 프로필 정보
  name         String
  birthYear    String    @map("birth_year")
  city         String
  district     String    @default("")
  education    String
  height       Int       // cm 정수
  job          String    // 직무 (자유입력)
  jobType      String    @map("job_type")     // 직업 형태 (선택)
  salary       String
  smoking      String
  mbti         String
  charm        String    @db.Text
  datingStyle  String    @map("dating_style") @db.Text
  phone        String
  imageUrl     String    @default("")  @map("image_url")

  // 서비스 관리
  expiresAt    DateTime? @map("expires_at")    // 만료일 (관리자 설정)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relations
  idealType         IdealType?
  sentMatches       MatchRequest[]  @relation("SentMatches")
  receivedMatches   MatchRequest[]  @relation("ReceivedMatches")
  cartItems         CartItem[]      @relation("CartOwner")
  cartedBy          CartItem[]      @relation("CartTarget")
  profileLinks      ProfileLink[]

  @@index([gender, status, blocked])
  @@index([status])
  @@index([email])
  @@map("users")
}

// ──────────────────────────────────────
// IDEAL TYPE (이상형 정보) - 1:1
// ──────────────────────────────────────

model IdealType {
  id         String  @id @default(uuid())
  userId     String  @unique @map("user_id")
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  height     String  // "176 ~ 180" 등
  ageRange   String  @map("age_range")  // "1996년 ~ 1994년" 등
  city       String
  district   String  @default("")
  smoking    String
  education  String
  jobType    String  @map("job_type")
  salary     String
  priority   String  // "키", "나이", "거주지" 등

  @@map("ideal_types")
}

// ──────────────────────────────────────
// MATCH REQUESTS (매칭 요청)
// ──────────────────────────────────────

model MatchRequest {
  id           String      @id @default(uuid())
  fromUserId   String      @map("from_user_id")
  toUserId     String      @map("to_user_id")
  action       MatchAction @default(PENDING)

  createdAt    DateTime    @default(now()) @map("created_at")
  rejectedAt   DateTime?   @map("rejected_at")

  fromUser     User        @relation("SentMatches", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUser       User        @relation("ReceivedMatches", fields: [toUserId], references: [id], onDelete: Cascade)

  @@unique([fromUserId, toUserId])  // 같은 상대에게 중복 요청 방지
  @@index([toUserId, action])       // 남성 페이지: 나에게 온 요청 조회
  @@index([fromUserId])             // 여성 페이지: 내가 보낸 요청 조회
  @@map("match_requests")
}

// ──────────────────────────────────────
// CART ITEMS (매칭 요청 목록 - 임시 저장)
// ──────────────────────────────────────

model CartItem {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  targetId   String   @map("target_id")
  addedAt    DateTime @default(now()) @map("added_at")

  user       User     @relation("CartOwner", fields: [userId], references: [id], onDelete: Cascade)
  target     User     @relation("CartTarget", fields: [targetId], references: [id], onDelete: Cascade)

  @@unique([userId, targetId])  // 같은 상대 중복 담기 방지
  @@index([userId])
  @@map("cart_items")
}

// ──────────────────────────────────────
// PROFILE LINKS (외부 공유 링크 - 5일 만료)
// ──────────────────────────────────────

model ProfileLink {
  id         String   @id @default(uuid())
  token      String   @unique @default(uuid())
  userId     String   @map("user_id")
  createdAt  DateTime @default(now()) @map("created_at")
  expiresAt  DateTime @map("expires_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("profile_links")
}
```

---

## 3. 테이블 상세 설명

### 3.1 `users` - 회원 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | 고유 식별자 |
| `email` | VARCHAR (UNIQUE) | 로그인 이메일 |
| `password` | VARCHAR | 비밀번호 (bcrypt 해시) |
| `gender` | ENUM | MALE / FEMALE |
| `role` | ENUM | USER / ADMIN |
| `status` | ENUM | PENDING → APPROVED / REJECTED |
| `blocked` | BOOLEAN | 관리자 차단 여부 |
| `name` | VARCHAR | 이름 |
| `birth_year` | VARCHAR | "1995년" |
| `city` | VARCHAR | "서울", "경기", "인천", "그 외 지역" |
| `district` | VARCHAR | "동부", "서부", "남부", "북부" (없으면 빈 문자열) |
| `education` | VARCHAR | 학력 |
| `height` | INTEGER | 키 (cm) |
| `job` | VARCHAR | 직무 (자유입력) |
| `job_type` | VARCHAR | 직업 형태 (선택지) |
| `salary` | VARCHAR | 연봉 범위 |
| `smoking` | VARCHAR | 흡연 여부 |
| `mbti` | VARCHAR | MBTI |
| `charm` | TEXT | 매력포인트 |
| `dating_style` | TEXT | 연애스타일 |
| `phone` | VARCHAR | 연락처 |
| `image_url` | VARCHAR | 프로필 이미지 URL (Supabase Storage) |
| `expires_at` | TIMESTAMP | 서비스 만료일 (관리자 설정, nullable) |
| `created_at` | TIMESTAMP | 가입일 |
| `updated_at` | TIMESTAMP | 마지막 수정일 |

**인덱스:**
- `(gender, status, blocked)` — 승인된 남성/여성 목록 조회 (가장 빈번한 쿼리)
- `(status)` — 관리자 페이지 상태별 필터
- `(email)` — 로그인 조회

**설계 포인트:**
- `height`를 데모에서는 문자열이었지만, 정수로 변경하여 범위 검색 가능
- `blocked`를 status와 별도로 분리: 승인된 사용자도 차단 가능한 구조 유지
- `role` 추가: 관리자 계정을 별도 비밀번호가 아닌 역할 기반으로 관리

### 3.2 `ideal_types` - 이상형 정보 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | 고유 식별자 |
| `user_id` | UUID (FK, UNIQUE) | users.id 참조 (1:1) |
| `height` | VARCHAR | "176 ~ 180" |
| `age_range` | VARCHAR | "1996년 ~ 1994년" |
| `city` | VARCHAR | 이상형 거주지 (시) |
| `district` | VARCHAR | 이상형 거주지 (구) |
| `smoking` | VARCHAR | 이상형 흡연 여부 |
| `education` | VARCHAR | 이상형 학력 |
| `job_type` | VARCHAR | 이상형 직업 형태 |
| `salary` | VARCHAR | 이상형 연봉 |
| `priority` | VARCHAR | 가장 중요한 조건 |

**설계 포인트:**
- 데모에서는 User에 `idealXxx` 필드를 직접 넣었지만, 정규화하여 별도 테이블로 분리
- 1:1 관계이므로 `user_id`에 UNIQUE 제약
- 이상형 조건이 추가/변경되어도 users 테이블에 영향 없음

### 3.3 `match_requests` - 매칭 요청 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | 고유 식별자 |
| `from_user_id` | UUID (FK) | 요청 보낸 사람 (여성) |
| `to_user_id` | UUID (FK) | 요청 받은 사람 (남성) |
| `action` | ENUM | PENDING → ACCEPTED / REJECTED |
| `created_at` | TIMESTAMP | 요청 생성일 |
| `rejected_at` | TIMESTAMP | 거절 시각 (쿨타임 계산용, nullable) |

**제약 조건:**
- `UNIQUE(from_user_id, to_user_id)` — 동일 상대에게 중복 요청 방지
- 거절 후 7일 쿨타임: `rejected_at`으로부터 7일 이후 재요청 가능 (앱 로직에서 처리)

**인덱스:**
- `(to_user_id, action)` — 남성이 받은 요청 조회 + 상태별 필터
- `(from_user_id)` — 여성이 보낸 요청 조회

### 3.4 `cart_items` - 매칭 요청 목록 (임시)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | 고유 식별자 |
| `user_id` | UUID (FK) | 담은 사람 (여성) |
| `target_id` | UUID (FK) | 담긴 상대 (남성) |
| `added_at` | TIMESTAMP | 담은 시각 |

**제약 조건:**
- `UNIQUE(user_id, target_id)` — 같은 상대 중복 방지
- 매칭 요청 확정 시 해당 유저의 cart_items 전체 삭제

### 3.5 `profile_links` - 외부 공유 링크

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | 고유 식별자 |
| `token` | VARCHAR (UNIQUE) | URL에 사용되는 토큰 |
| `user_id` | UUID (FK) | 대상 프로필 |
| `created_at` | TIMESTAMP | 생성일 |
| `expires_at` | TIMESTAMP | 만료일 (생성 후 5일) |

---

## 4. 주요 쿼리 패턴

### 여성 페이지: 승인된 남성 프로필 목록

```typescript
const males = await prisma.user.findMany({
  where: { gender: "MALE", status: "APPROVED", blocked: false },
  include: { idealType: true },
  orderBy: { createdAt: "desc" },
  take: 20,
  skip: (page - 1) * 20,
});
```

### 남성 페이지: 나에게 온 매칭 요청

```typescript
const matches = await prisma.matchRequest.findMany({
  where: { toUserId: currentUser.id },
  include: { fromUser: true },
  orderBy: { createdAt: "desc" },
});
```

### 매칭 요청 생성 (거절 쿨타임 체크 포함)

```typescript
const recentRejection = await prisma.matchRequest.findFirst({
  where: {
    fromUserId: userId,
    toUserId: targetId,
    action: "REJECTED",
    rejectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  },
});
if (recentRejection) throw new Error("7일 쿨타임");
```

### 관리자: 만료 자동 블락 (Cron Job)

```typescript
await prisma.user.updateMany({
  where: {
    expiresAt: { lt: new Date() },
    blocked: false,
    status: "APPROVED",
  },
  data: { blocked: true },
});
```

---

## 5. 마이그레이션 전략 (데모 → 실서비스)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 1 | Supabase 프로젝트 생성 + `prisma migrate dev` | 30분 |
| 2 | `store.ts` → Prisma Client 호출로 교체 | 2~3시간 |
| 3 | 이미지 업로드 → Supabase Storage 연동 | 1시간 |
| 4 | 인증 → Supabase Auth 또는 NextAuth 전환 | 2시간 |
| 5 | Vercel Cron 설정 (자동 블락, 쿨타임 해제) | 30분 |
| 6 | 시드 데이터 이관 + 테스트 | 1시간 |

**총 예상: 약 1일 작업**

---

## 6. 향후 확장 고려사항

- **알림 테이블** (`notifications`): 매칭 수락/거절 시 상대방에게 알림
- **메시지 테이블** (`messages`): 매칭 확정 후 채팅 기능
- **결제 테이블** (`payments`): 유료 서비스 결제 내역
- **로그 테이블** (`audit_logs`): 관리자 액션 기록 (승인, 반려, 차단 등)
- **신고 테이블** (`reports`): 사용자 간 신고 기능
