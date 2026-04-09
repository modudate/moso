# 비개발자 프로젝트 가이드

> **용도**: 체크리스트 항목의 배경 지식과 구체적인 확인 방법을 담은 참고 문서입니다.
> 

---

## 1. 프로젝트 시작 전

### 1-1. 왜 DB 구조와 인증을 먼저 정해야 하는가

AI는 코드를 빠르게 만들어주지만, **잘못된 구조로 빠르게 만들면** 나중에 전부 뜯어고쳐야 합니다.

특히 아래 두 가지는 프로젝트 중반 이후에 바꾸기가 가장 어렵습니다:

- **DB 테이블 구조**: 데이터가 쌓인 후에 구조를 바꾸면 기존 데이터 마이그레이션이 필요
- **인증 방식**: 로그인 방식을 바꾸면 기존 유저가 접속 불가해질 수 있음

개발팀과 합의해야 할 최소 항목:

| 항목 | 합의할 내용 |
| --- | --- |
| DB 테이블 | 어떤 데이터를 어떤 테이블에 저장할지 |
| 인증 | Supabase Auth, Google Login, 카카오 로그인 등 |
| 파일 업로드 | 이미지/파일이 필요한 기능이 있는지, 어디에 저장할지 |

---

## 2. 눈으로 직접 확인하는 항목

### 2-1. 디렉토리 및 파일 이름

### 왜 영문 이름을 써야 하는가

한글이나 띄어쓰기가 포함된 파일명은:

- 서버 배포 시 경로 인식 오류 발생
- URL 인코딩 문제로 페이지가 안 열림
- 다른 운영체제(Mac ↔ Windows)에서 깨질 수 있음

### 올바른 이름 규칙

| 대상 | 규칙 | 좋은 예 | 나쁜 예 |
| --- | --- | --- | --- |
| 폴더/파일 | kebab-case (소문자-하이픈) | `user-profile.tsx` | `UserProfile.tsx`, `user profile.tsx` |
| 컴포넌트 파일 | PascalCase | `ProfileCard.tsx` | `profile-card.tsx` |
| 페이지 | Next.js 규칙 (폴더명이 URL) | `app/dashboard/page.tsx` | `app/대시보드/page.tsx` |

### Next.js App Router 기본 구조

```
app/
├── (auth)/                     ← 괄호 그룹: URL에 포함 안 됨
│   ├── login/page.tsx
│   └── register/page.tsx
├── dashboard/page.tsx          ← /dashboard 로 접근
├── admin/page.tsx              ← /admin 으로 접근
├── api/                        ← 서버 API
│   └── cron/route.ts
└── layout.tsx                  ← 모든 페이지 공통 레이아웃
```

### 의미 없는 이름 피하기

```
❌ page1.tsx, comp1.tsx, data.ts, utils2.ts, temp.tsx
✅ user-list.tsx, ProfileCard.tsx, auth-helpers.ts, order-utils.ts
```

---

### 2-2. 한글 변수/함수 확인 방법

### 왜 문제인가

한글 변수명은 기술적으로 동작하지만:

- 다른 개발자가 코드를 읽기 어려움
- 자동 완성, 검색, 리팩토링 도구가 제대로 작동하지 않을 수 있음
- 국제 협업이나 오픈소스 전환 시 전면 수정 필요

### 확인 방법

1. Cursor(또는 VS Code)에서 `Ctrl+Shift+F` (전체 검색)
2. 검색창 오른쪽의 `.*` 버튼 클릭 (정규식 모드)
3. `[가-힣]` 입력 후 검색
4. `.ts`, `.tsx` 파일 결과 확인

**한글이 있어도 괜찮은 경우:**

- 문자열 값: `const name = "홍길동"` → OK
- 주석: `// 유저 목록을 가져온다` → OK
- UI 텍스트: `<button>로그인</button>` → OK

**한글이 있으면 안 되는 경우:**

- 변수명: `const 유저이름 = "홍길동"` → ❌
- 함수명: `function 유저삭제() {}` → ❌
- 타입명: `type 유저정보 = { ... }` → ❌

---

### 2-3. 환경변수(.env) 상세 가이드

### 환경변수가 뭔가

환경변수는 **코드 바깥에서 설정값을 주입하는 방법**입니다.
비밀번호나 API 키처럼 코드에 직접 적으면 안 되는 값을 별도 파일(`.env`)에 넣고,
코드에서는 `process.env.변수명`으로 읽습니다.

```
# .env.local 파일 (비밀 — Git에 올리지 않음)
NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

```tsx
// 코드에서 사용
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
```

### .env 파일 종류

| 파일명 | 용도 | Git에 올려도 되는가 |
| --- | --- | --- |
| `.env` | 모든 환경 공통 기본값 | ❌ |
| `.env.local` | 내 컴퓨터 전용 (실제 키) | ❌ |
| `.env.development` | 개발 환경 전용 | 상황에 따라 |
| `.env.production` | 배포 환경 전용 | 상황에 따라 |
| `.env.example` | 필요한 변수 양식만 기록 | ✅ 반드시 포함 |

`.env.example` 예시 (실제 값 없이 양식만):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

잘못된 파일명: `env.txt`, `환경변수.env`, `.env_backup`, `config.env`

### NEXT_PUBLIC_ 접두어 규칙

Next.js에서 환경변수 이름이 `NEXT_PUBLIC_`으로 시작하면 **브라우저에서 접근 가능**합니다.
시작하지 않으면 **서버에서만** 사용됩니다.

| 변수 | 접근 가능 위치 | 용도 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저 + 서버 | Supabase 주소 (공개 가능) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 + 서버 | 공개용 키 (RLS로 보호) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버만 | **관리자 키 — 브라우저 노출 시 보안 사고** |

**핵심**: `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하는 관리자 키입니다.
이 키가 브라우저에 노출되면 누구나 전체 DB에 접근할 수 있습니다.

### 하드코딩 확인 방법

전체 검색(`Ctrl+Shift+F`)으로 아래 키워드를 검색하세요:

- `supabase`, `key`, `secret`, `password`, `token`

검색 결과에서 `eyJ...`처럼 긴 문자열이 코드에 직접 적혀있으면 문제입니다.

```tsx
// ❌ 하드코딩 — 키가 코드에 그대로 노출
const key = "eyJhbGciOiJIUzI1NiIs..."

// ✅ 환경변수 사용
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### .env 파일 외부 노출 확인

배포 후 반드시 확인하세요:

1. **브라우저에서 직접 접근 테스트**
    - `https://your-domain.vercel.app/.env` 입력
    - `https://your-domain.vercel.app/.env.local` 입력
    - 파일 내용이 보이면 → **즉시 개발팀에 연락, 키 재발급**
    - 정상: 404 페이지 또는 메인으로 리디렉트
2. **GitHub 저장소 확인**
    - GitHub 웹사이트에서 저장소 열기
    - `.env` 파일이 목록에 보이면 → **키 즉시 재발급**
    - 한 번이라도 올라간 적이 있으면 Git 기록에 남아있으므로 키 교체 필수
3. **public 폴더 확인**
    - `public/` 폴더 안의 파일은 누구나 URL로 접근 가능
    - `.env`나 키가 포함된 파일이 `public/` 안에 없어야 함

---

### 2-4. 민감정보 출력 확인

### 과거 사례

비밀번호가 평문으로 DB에 저장되어 `console.log`에 그대로 출력된 적이 있습니다.
Supabase Auth를 사용하면 비밀번호를 직접 다루지 않으므로 이 문제가 원천 차단됩니다.

### console.log 확인 방법

전체 검색으로 `console.log` 검색 후 아래가 출력되는 곳을 찾으세요:

```tsx
// ❌ 민감정보 출력
console.log("password:", password)
console.log("user:", user)           // user 객체에 토큰, 이메일 등 포함 가능
console.log("token:", session.token)

// ✅ 안전한 로깅
console.log("login attempt for:", email)
console.log("user count:", users.length)
```

### 비밀번호 직접 저장 금지

Supabase Auth를 사용하면 비밀번호는 Supabase가 암호화 처리합니다.
**별도 password 컬럼을 만들어서 저장하면 안 됩니다.**

```
❌ 테이블에 password 컬럼이 존재
✅ 인증은 Supabase Auth에 맡기고, 테이블에는 프로필 정보만 저장
```

---

## 3. AI에게 작업 맡길 때

### 3-1. 효과적인 작업 지시 방법

### 한 번에 하나씩

```
❌ "회원가입, 로그인, 관리자, 대시보드 전부 만들어줘"
✅ "회원가입 페이지를 먼저 만들어줘. Supabase Auth를 사용해줘"
```

AI에게 한꺼번에 많은 기능을 요청하면:

- 기능 간 충돌이 생기기 쉬움
- 문제가 생겼을 때 어디서 잘못됐는지 찾기 어려움
- 나중에 수정할 때 영향 범위가 커짐

### 기존 코드가 있을 때

새 기능을 추가하기 전에 반드시:

```
"이 프로젝트의 구조를 먼저 파악해줘"
```

이 한 마디를 먼저 요청하세요. AI가 기존 패턴을 무시하고 다른 방식으로 만드는 것을 방지합니다.

### 3-2. any 타입이 왜 문제인가

TypeScript의 `any`는 "아무 타입이나 허용"이라는 뜻으로,
타입 검사를 사실상 끄는 것과 같습니다.

```tsx
// ❌ any — 오타나 잘못된 접근을 잡아주지 못함
const user: any = getUser()
user.nmae  // 오타인데 에러가 안 남

// ✅ 타입 지정 — 오타를 즉시 발견
const user: User = getUser()
user.nmae  // 컴파일 에러: 'nmae'은 존재하지 않음. 'name'을 의미했나요?
```

전체 검색으로 `: any`를 검색해서 5개 이상이면 개발팀에 리뷰를 요청하세요.

---

## 4. Supabase 관련

### 4-1. 테이블 설계 가이드

### 과거 사례

컬럼 이름이 `d1`, `d2`, `info1` 같은 추상적 이름이어서 나중에 어떤 데이터인지 알 수 없었고,
같은 정보가 여러 테이블에 중복 저장되어 있었습니다.

### 컬럼 이름 규칙

```
❌ col1, data, info, val, tmp, flag
✅ user_name, gender, birth_year, is_approved, expired_at
```

영문 소문자 + 밑줄(snake_case)로 작성하고, 이름만 보고 어떤 데이터인지 알 수 있어야 합니다.

### 기본 컬럼

모든 테이블에 아래 컬럼이 있어야 합니다:

- `id` — uuid, Primary Key
- `created_at` — 생성 일시
- `updated_at` — 수정 일시 (필요한 경우)

### 컬럼 타입

| 데이터 | 올바른 타입 | 잘못된 타입 |
| --- | --- | --- |
| 날짜/시간 | `timestamptz` | `text` ("2024-01-01" 문자열) |
| 숫자 | `integer`, `numeric` | `text` ("12345" 문자열) |
| 참/거짓 | `boolean` | `text` ("Y"/"N" 문자열) |
| 선택지 | `text` + Check 제약 | 제약 없는 자유 입력 |

### 중복 데이터 금지

```
❌ 주문 테이블에 customer_name, customer_email을 복사 저장
✅ customer_id로 유저 테이블을 참조 (관계 설정)
```

### 4-2. RLS (Row Level Security) — 가장 중요

### 왜 위험한가

RLS가 꺼져있으면 브라우저 개발자 도구에서 Supabase API URL과 anon key만으로
**전체 유저 데이터를 조회, 수정, 삭제**할 수 있습니다.
anon key는 프론트엔드에 노출되어 있으므로 누구나 볼 수 있습니다.

### 확인 방법 (비개발자)

Supabase Dashboard → Table Editor → 각 테이블 클릭 →
상단에 "RLS" 버튼이 **"Enabled"** 상태인지만 확인하세요.
정책의 내용이 적절한지는 개발팀이 확인해야 합니다.

### 4-3. 인증 설정 확인 포인트

소셜 로그인(Google, 카카오 등) 사용 시 **리디렉트 URL**이 맞아야 합니다:

| 환경 | 등록해야 할 URL |
| --- | --- |
| 개발 | `http://localhost:3000` |
| 배포 | `https://your-domain.vercel.app` |

두 URL 모두 Supabase Dashboard → Authentication → URL Configuration에 등록되어 있어야 합니다.
하나라도 빠지면 해당 환경에서 로그인이 실패합니다.

### 4-4. Storage (이미지/파일 업로드)

### 버킷 공개/비공개

| 설정 | 의미 | 적합한 용도 |
| --- | --- | --- |
| Public | URL만 알면 누구나 접근 | 프로필 사진, 상품 이미지 |
| Private | 인증된 사용자만 접근 | 신분증, 계약서, 민감 문서 |

Supabase에서 버킷 생성 시 기본값이 Public일 수 있으므로 반드시 확인하세요.

### Storage RLS

DB 테이블 RLS와 별개로 Storage에도 별도 접근 정책이 필요합니다.
Storage RLS가 없으면 파일 경로를 추측해서 다른 사람의 파일을 보거나 삭제할 수 있습니다.

**이 설정은 개발팀에 맡기세요.** 비개발자가 확인할 항목:

- Supabase Dashboard → Storage → Policies에 정책이 하나라도 있는지

### 파일 업로드 안전 규칙

**파일 크기 제한** — 제한 없으면 수 GB 파일이 올라올 수 있음

```tsx
// 업로드 전 크기 체크
if (file.size > 5 * 1024 * 1024) {
  alert("5MB 이하만 업로드 가능합니다")
  return
}
```

**파일 타입 제한** — 이미지만 받아야 하는 곳에서 `.exe` 등이 올라오지 않도록

```html
<!-- HTML에서 허용 타입 지정 -->
<input type="file" accept="image/jpeg,image/png,image/webp" />
```

**파일명 안전 처리** — 한글/특수문자 파일명은 URL 문제를 일으킴

```
❌ 사용자 파일명 그대로: 내 사진(최종).jpg
✅ UUID로 변환: 550e8400-e29b-41d4-a716-446655440000.jpg
```

**유저별 폴더 분리**

```
❌ /uploads/image1.jpg (모든 파일이 한 폴더)
✅ /users/{user_id}/avatar.jpg (유저별 분리)
```

### Next.js 이미지 표시 설정

Supabase Storage의 이미지를 Next.js `<Image>` 컴포넌트로 표시하려면
`next.config.js`에 도메인 등록이 필요합니다:

```jsx
// next.config.js
module.exports = {
  images: {
    remotePatterns: [{ hostname: "*.supabase.co" }]
  }
}
```

### Storage 용량 (무료 플랜)

| 항목 | 한도 |
| --- | --- |
| 저장 용량 | 1GB |
| 월 전송량 | 2GB |

이미지가 많은 서비스라면 금방 초과합니다. 고려할 것:

- 프로필 사진 교체 시 이전 파일 삭제
- 업로드 시 리사이즈/압축 (프로필: 500KB 이하, 썸네일: 100KB 이하)
- 탈퇴 유저 파일 처리 정책

---

## 5. 페이지 접근/권한

### 5-1. 접근 제어 테스트 방법

브라우저에서 직접 테스트하세요:

1. **로그아웃 상태에서** 주소창에 직접 입력:
    - `https://your-domain.vercel.app/dashboard`
    - `https://your-domain.vercel.app/admin`
    - → 로그인 페이지로 이동해야 정상
2. **일반 유저로 로그인 후** 관리자 페이지 접근:
    - `https://your-domain.vercel.app/admin`
    - → 차단되거나 권한 없음 메시지가 나와야 정상
3. **승인 기능이 있는 경우** 승인 대기 유저로 로그인:
    - 서비스 주요 기능이 사용 불가해야 정상

### 5-2. 프론트엔드만 체크하면 안 되는 이유

```tsx
// ❌ 프론트엔드에서만 권한 체크 — 브라우저 도구로 우회 가능
if (user.role === 'admin') {
  showAdminPanel()
}

// ✅ 서버(API Route 또는 RLS)에서도 반드시 체크
// → 프론트엔드 체크를 우회해도 서버에서 차단
```

프론트엔드 권한 체크는 **UX 편의**일 뿐 **보안 수단이 아닙니다.**
브라우저 개발자 도구에서 JavaScript를 수정하면 프론트엔드 체크를 건너뛸 수 있습니다.
실제 보안은 Supabase RLS 또는 API Route의 서버 측 검증이 담당합니다.

---

## 6. 배포

### 6-1. Vercel 환경변수 등록

Vercel Dashboard → Settings → Environment Variables에서 등록합니다.

필수 환경변수:

| 변수명 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개용 API 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 관리자 키 |

크론잡이 필요한 경우 `vercel.json` 설정:

```json
{
  "crons": [{ "path": "/api/cron/작업명", "schedule": "0 0 * * *" }]
}
```

### 6-2. 배포 후 테스트 체크포인트

| 테스트 | 확인 방법 |
| --- | --- |
| 페이지 로딩 | 메인 URL 접속 |
| 회원가입/로그인 | 실제로 가입 → 로그인 수행 |
| 핵심 CRUD | 데이터 생성/조회/수정/삭제 |
| 이미지 업로드 | 업로드 후 새로고침해도 표시되는지 |
| Console 확인 | F12 → Console 탭에 민감정보 없는지 |
| 모바일 | 휴대폰으로 접속하여 레이아웃 확인 |

---

## 7. 개발팀에 리뷰 요청할 때

### 전달할 정보

```
1. GitHub 저장소 URL (또는 Vercel 프로젝트 URL)
2. Supabase 프로젝트 URL
3. 기획문서 링크
4. AI에게 어떤 지시를 했는지 (프롬프트 요약)
5. 현재 안 되는 것 / 의심되는 부분
```

### 개발팀 필수 리뷰 항목 요약

| 항목 | 위험 |
| --- | --- |
| DB 테이블 구조 | 잘못 설계하면 전면 재작업 |
| RLS 정책 (DB + Storage) | 보안 사고의 가장 큰 원인 |
| 인증/권한 로직 | 프론트만 체크하면 우회 가능 |
| Storage 버킷 권한 | 다른 유저 파일 접근/삭제 가능 |
| 크론잡 로직 | 잘못되면 데이터 정합성 깨짐 |
| 결제/개인정보 처리 | 법적 이슈 가능 |



## 프로젝트 시작 전

- [ ]  DB 테이블 구조를 개발팀과 합의했는가?
- [ ]  인증 방식을 개발팀과 확정했는가?

## AI 작업 후 내가 확인

- [ ]  폴더/파일명에 한글이나 띄어쓰기가 없는가?
- [ ]  전체 검색(Ctrl+Shift+F)으로 [가-힣] 검색 → 변수명 위치에 한글이 없는가?
- [ ]  .env 파일이 .gitignore에 포함되어 있는가?
- [ ]  전체 검색으로 긴 키 문자열이 코드에 직접 적혀있지 않은가?

## 개발팀에 반드시 넘길 것

- [ ]  RLS 설정 확인
- [ ]  Storage 권한 확인
- [ ]  서버 측 인증/권한 검증
- [ ]  결제/개인정보 처리 로직

## 배포 후 내가 테스트

- [ ]  로그아웃 상태에서 /admin, /dashboard 직접 입력 → 차단되는가?
- [ ]  F12 Console에 비밀번호/토큰이 출력되지 않는가?
- [ ]  모바일에서 레이아웃이 깨지지 않는가?

## 개발팀에 넘길 때

리뷰 요청 시 아래를 함께 전달:

1. GitHub 저장소 URL
2. Supabase 프로젝트 URL
3. 기획문서 링크
4. AI에게 어떤 지시를 했는지 (프롬프트 요약)
5. 현재 안 되는 것 / 의심되는 부분