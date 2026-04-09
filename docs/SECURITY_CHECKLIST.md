# 모두의 모임 - 보안 점검표 및 구현 가이드

> 기술 스택: Next.js 14 (App Router, TypeScript), Supabase (Auth + DB + Storage), Vercel 배포
> 기준 문서: SPEC_NOTION.md, DATABASE_DESIGN.md
> 작성일: 2026-03-12

---

## [영역 1] 인증 및 세션 관리

### 점검 항목 1-1: 관리자 MFA(2단계 인증)
- **위험도:** CRITICAL
- **현재 상태:** Google OAuth만으로 관리자 인증. admins 테이블 이메일 일치 시 /admin 분기. MFA 미적용.
- **권장 조치:** Supabase Auth MFA 활성화 + 관리자 로그인 시 TOTP 강제 적용
- **구현 코드:**

```typescript
// src/lib/admin-mfa.ts
import { createClient } from '@supabase/supabase-js';

export async function enrollAdminMFA(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'admin-totp',
  });
  if (error) throw error;
  return data; // QR code URI 반환 → 관리자에게 표시
}

export async function verifyAdminMFA(
  supabase: ReturnType<typeof createClient>,
  factorId: string,
  code: string
) {
  const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
  if (!challenge) throw new Error('MFA challenge failed');

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) throw new Error('MFA verification failed');
  return data;
}
```

```typescript
// src/middleware.ts - 관리자 MFA 강제 체크
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/admin')) return NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie adapter */ } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];

  if (!totp || totp.status !== 'verified') {
    return NextResponse.redirect(new URL('/admin/mfa-setup', request.url));
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') {
    return NextResponse.redirect(new URL('/admin/mfa-verify', request.url));
  }

  return NextResponse.next();
}
```

- **검증 방법:** 관리자 계정 로그인 후 /admin 접근 시 MFA 화면 강제 이동 확인

---

### 점검 항목 1-2: 세션 관리 정책
- **위험도:** HIGH
- **현재 상태:** Supabase 기본 세션 정책 사용 (기본 JWT 1시간). 명시적 세션 정책 없음.
- **권장 조치:** JWT 만료 15분, Refresh Token 7일, 로그아웃 시 서버사이드 무효화
- **구현 코드:**

Supabase 프로젝트 Settings → Auth 설정:
```
JWT Expiry: 900 (15분)
Refresh Token Rotation: Enabled
Refresh Token Reuse Interval: 10 (초)
```

```typescript
// src/app/api/auth/logout/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  await supabase.auth.signOut({ scope: 'global' }); // 모든 세션 무효화
  return NextResponse.json({ success: true });
}
```

- **검증 방법:** 로그인 후 15분 경과 시 자동 토큰 갱신 확인, 로그아웃 후 다른 탭 세션 만료 확인

---

### 점검 항목 1-3: IDOR(Insecure Direct Object Reference) 방어
- **위험도:** CRITICAL
- **현재 상태:** 접근 권한이 명세에 텍스트로만 정의됨. 구현 시 서버사이드 검증 누락 가능성 높음.
- **권장 조치:** 모든 동적 라우트에 서버사이드 권한 검증 미들웨어 적용
- **구현 코드:**

```typescript
// src/lib/auth-guard.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type UserRole = 'male' | 'female';
type RequiredRole = UserRole | 'admin' | 'any';

export async function requireAuth(requiredRole: RequiredRole = 'any') {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* adapter */ } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (requiredRole === 'admin') {
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single();
    if (!admin) redirect('/');
    return { user, role: 'admin' as const };
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!dbUser || dbUser.status !== 'active') redirect('/login');
  if (requiredRole !== 'any' && dbUser.role !== requiredRole) redirect('/');

  return { user, role: dbUser.role, status: dbUser.status };
}

// /female/[maleId] - active 여성만 접근
// 사용: const { user } = await requireAuth('female');

// /male/[femaleId] - active 남성 + 해당 여성이 매칭 요청을 보낸 경우만
export async function requireMatchAccess(maleUserId: string, femaleProfileId: string) {
  const supabase = createServerClient(/* ... */);
  const { data: match } = await supabase
    .from('match_requests')
    .select('id')
    .eq('male_profile_id', maleUserId)
    .eq('female_profile_id', femaleProfileId)
    .single();

  if (!match) {
    const { data: mdRec } = await supabase
      .from('md_recommendations')
      .select('id')
      .eq('male_profile_id', maleUserId)
      .eq('female_profile_id', femaleProfileId)
      .single();
    if (!mdRec) redirect('/male');
  }
}
```

- **검증 방법:** 여성 계정으로 /male/[femaleId] 직접 URL 접근 시 리다이렉트 확인, 매칭 요청 없는 femaleId 접근 시 리다이렉트 확인

---

### 점검 항목 1-4: 관리자 로그인 IP 로깅
- **위험도:** MEDIUM
- **현재 상태:** 미구현
- **권장 조치:** admin_audit_logs에 로그인 이벤트 기록 + 새 IP 감지 시 알림
- **구현 코드:**

```sql
CREATE TABLE admin_login_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID NOT NULL REFERENCES admins(id),
  ip_address INET NOT NULL,
  user_agent TEXT,
  logged_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_login_logs_admin ON admin_login_logs(admin_id, logged_at DESC);
```

```typescript
// src/app/api/auth/callback/route.ts 내부 (로그인 콜백)
async function logAdminLogin(adminId: string, request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const ua = request.headers.get('user-agent') || '';

  const supabase = createServiceRoleClient();

  const { data: recentIPs } = await supabase
    .from('admin_login_logs')
    .select('ip_address')
    .eq('admin_id', adminId)
    .order('logged_at', { ascending: false })
    .limit(20);

  const knownIPs = new Set(recentIPs?.map(r => r.ip_address));

  await supabase.from('admin_login_logs').insert({
    admin_id: adminId,
    ip_address: ip,
    user_agent: ua,
  });

  if (!knownIPs.has(ip) && knownIPs.size > 0) {
    // 새 IP 감지 → 알림 (이메일/슬랙 등)
    console.warn(`[SECURITY] 관리자 새 IP 로그인: ${ip}`);
  }
}
```

- **검증 방법:** 관리자 로그인 후 admin_login_logs 테이블 레코드 확인

---

## [영역 2] 프로필 공유 링크 보안

### 점검 항목 2-1: 토큰 생성 보안
- **위험도:** HIGH
- **현재 상태:** 명세서에 "토큰 기반, 5일 만료"만 정의. 토큰 생성 방식 미명시.
- **권장 조치:** crypto.randomUUID() 대신 256bit 랜덤 토큰 사용, 접근 횟수 제한
- **구현 코드:**

```sql
CREATE TABLE profile_share_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        TEXT UNIQUE NOT NULL,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  access_count INT DEFAULT 0,
  max_access   INT DEFAULT 10,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_share_links_token ON profile_share_links(token);
```

```typescript
// src/lib/share-link.ts
import { randomBytes } from 'crypto';

export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url'); // 256bit
}

export async function createShareLink(supabase: any, userId: string) {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 5);

  const { data, error } = await supabase
    .from('profile_share_links')
    .insert({
      token,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return `${process.env.NEXT_PUBLIC_BASE_URL}/profile/${token}`;
}
```

- **검증 방법:** 생성된 토큰 길이 43자(base64url 32bytes) 확인, 11회 접근 시 거부 확인

---

### 점검 항목 2-2: 링크 접근 제한 및 로깅
- **위험도:** HIGH
- **현재 상태:** 접근 제한 없음. 토큰만 있으면 무제한 열람 가능.
- **권장 조치:** 최대 10회 접근 제한, IP/UA 로깅, OG 메타태그 민감정보 제외
- **구현 코드:**

```typescript
// src/app/profile/[token]/page.tsx (Server Component)
export async function generateMetadata({ params }: { params: { token: string } }) {
  return {
    title: '모두의 모임 - 프로필',
    // 절대 프로필 정보를 OG 태그에 넣지 않음
    openGraph: {
      title: '모두의 모임',
      description: '프로필을 확인해보세요',
    },
  };
}

async function getShareLink(token: string) {
  const supabase = createServiceRoleClient();

  const { data: link } = await supabase
    .from('profile_share_links')
    .select('*')
    .eq('token', token)
    .single();

  if (!link) return { error: 'NOT_FOUND' };
  if (new Date(link.expires_at) < new Date()) return { error: 'EXPIRED' };
  if (link.access_count >= link.max_access) return { error: 'MAX_ACCESS' };

  await supabase
    .from('profile_share_links')
    .update({ access_count: link.access_count + 1 })
    .eq('id', link.id);

  return { link };
}
```

- **검증 방법:** 만료된 링크 접근 시 만료 안내, 11회째 접근 시 거부 메시지 확인

---

### 점검 항목 2-3: 만료 토큰 정기 삭제
- **위험도:** LOW
- **현재 상태:** 크론잡으로 만료일 자동 블락만 언급. 만료 링크 삭제 미언급.
- **권장 조치:** 일일 크론잡으로 만료 토큰 삭제, CRON_SECRET 인증
- **구현 코드:**

```typescript
// src/app/api/cron/cleanup-links/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('profile_share_links')
    .delete()
    .lt('expires_at', new Date().toISOString());

  return NextResponse.json({ success: !error });
}
```

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/cleanup-links", "schedule": "0 3 * * *" },
    { "path": "/api/cron/expire-users", "schedule": "0 */6 * * *" }
  ]
}
```

- **검증 방법:** 크론 실행 후 만료 링크 레코드 삭제 확인

---

## [영역 3] 데이터베이스 보안

### 점검 항목 3-1: Supabase RLS 정책
- **위험도:** CRITICAL
- **현재 상태:** admin_notes에만 RLS 정의. 다른 테이블 RLS 미정의.
- **권장 조치:** 모든 테이블에 RLS 활성화 + 역할별 정책 작성
- **구현 코드:**

```sql
-- ── users 테이블 ──
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_read ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY users_admin_all ON users FOR ALL
  USING (auth.uid() IN (SELECT id FROM admins));

-- ── male_profiles 테이블 ──
ALTER TABLE male_profiles ENABLE ROW LEVEL SECURITY;

-- active 여성은 active 남성 프로필 읽기 가능
CREATE POLICY male_profiles_female_read ON male_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'female'
        AND users.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = male_profiles.user_id
        AND users.status = 'active'
    )
  );

-- 본인 프로필 읽기
CREATE POLICY male_profiles_self_read ON male_profiles FOR SELECT
  USING (user_id = auth.uid());

-- 관리자 전체 접근
CREATE POLICY male_profiles_admin_all ON male_profiles FOR ALL
  USING (auth.uid() IN (SELECT id FROM admins));

-- ── female_profiles 테이블 ──
ALTER TABLE female_profiles ENABLE ROW LEVEL SECURITY;

-- active 남성은 자신에게 매칭 요청 보낸 여성만 읽기 가능
CREATE POLICY female_profiles_male_read ON female_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM match_requests
      WHERE match_requests.female_profile_id = female_profiles.id
        AND match_requests.male_profile_id IN (
          SELECT mp.id FROM male_profiles mp WHERE mp.user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1 FROM md_recommendations
      WHERE md_recommendations.female_profile_id = female_profiles.id
        AND md_recommendations.male_profile_id IN (
          SELECT mp.id FROM male_profiles mp WHERE mp.user_id = auth.uid()
        )
    )
  );

CREATE POLICY female_profiles_self_read ON female_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY female_profiles_admin_all ON female_profiles FOR ALL
  USING (auth.uid() IN (SELECT id FROM admins));

-- ── match_requests 테이블 ──
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_requests_female_insert ON match_requests FOR INSERT
  WITH CHECK (
    female_profile_id IN (
      SELECT id FROM female_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY match_requests_male_update ON match_requests FOR UPDATE
  USING (
    male_profile_id IN (
      SELECT id FROM male_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY match_requests_participant_read ON match_requests FOR SELECT
  USING (
    female_profile_id IN (SELECT id FROM female_profiles WHERE user_id = auth.uid())
    OR male_profile_id IN (SELECT id FROM male_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY match_requests_admin_all ON match_requests FOR ALL
  USING (auth.uid() IN (SELECT id FROM admins));

-- ── admin_notes (이미 정의됨) ──
-- ── md_recommendations ──
ALTER TABLE md_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY md_recs_admin_insert ON md_recommendations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM admins));

CREATE POLICY md_recs_male_read ON md_recommendations FOR SELECT
  USING (
    male_profile_id IN (SELECT id FROM male_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY md_recs_male_update ON md_recommendations FOR UPDATE
  USING (
    male_profile_id IN (SELECT id FROM male_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY md_recs_admin_all ON md_recommendations FOR ALL
  USING (auth.uid() IN (SELECT id FROM admins));

-- ── rejection_logs ──
ALTER TABLE rejection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY rejection_logs_admin_all ON rejection_logs FOR ALL
  USING (auth.uid() IN (SELECT id FROM admins));

CREATE POLICY rejection_logs_participant_read ON rejection_logs FOR SELECT
  USING (
    female_profile_id IN (SELECT id FROM female_profiles WHERE user_id = auth.uid())
    OR male_profile_id IN (SELECT id FROM male_profiles WHERE user_id = auth.uid())
  );
```

- **검증 방법:** 여성 계정으로 다른 여성 프로필 직접 쿼리 시 빈 결과 확인, 일반 회원으로 admin_notes 쿼리 시 빈 결과 확인

---

### 점검 항목 3-2: SQL Injection 방어
- **위험도:** HIGH
- **현재 상태:** Raw SQL (pg / Supabase JS Client) 사용으로 명시. 직접 쿼리 작성 시 주입 위험.
- **권장 조치:** Parameterized Query만 사용, 문자열 보간 금지
- **구현 코드:**

```typescript
// GOOD: Supabase JS Client (자동 파라미터화)
const { data } = await supabase
  .from('male_profiles')
  .select('*')
  .eq('user_id', userId);

// GOOD: Raw SQL with parameterized query
const { data } = await supabase.rpc('search_users', {
  search_term: searchInput,
  min_length: 2,
});

// BAD: 절대 금지
// const { data } = await supabase.rpc('raw_query', {
//   sql: `SELECT * FROM users WHERE name LIKE '%${input}%'`
// });
```

```sql
-- DB function으로 검색 로직 캡슐화
CREATE OR REPLACE FUNCTION search_users(search_term TEXT, min_length INT DEFAULT 2)
RETURNS SETOF users AS $$
BEGIN
  IF length(search_term) < min_length THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT u.* FROM users u
    LEFT JOIN male_profiles mp ON mp.user_id = u.id
    LEFT JOIN female_profiles fp ON fp.user_id = u.id
    WHERE u.phone LIKE '%' || search_term || '%'
       OR COALESCE(mp.real_name, fp.real_name) LIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- **검증 방법:** 검색란에 `'; DROP TABLE users; --` 입력 시 정상 에러 반환 확인

---

### 점검 항목 3-3: 민감 데이터 암호화
- **위험도:** HIGH
- **현재 상태:** 전화번호(phone) 평문 저장. 본명(real_name) 평문 저장.
- **권장 조치:** 전화번호를 앱 레벨 AES-256 암호화 후 저장, 복호화는 관리자 API에서만
- **구현 코드:**

```typescript
// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32bytes hex

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encHex] = ciphertext.split(':');
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}
```

- **검증 방법:** DB에서 phone 컬럼 직접 조회 시 암호문 확인, 관리자 API를 통해서만 평문 표시 확인

---

## [영역 4] 입력 검증 및 XSS 방지

### 점검 항목 4-1: 자유 텍스트 필드 새니타이징
- **위험도:** HIGH
- **현재 상태:** 닉네임, 매력, 연애스타일, 본명 등 자유 텍스트 필드 다수 존재. 새니타이징 미정의.
- **권장 조치:** 서버사이드 sanitize-html 적용, 프론트에서도 이스케이프
- **구현 코드:**

```typescript
// src/lib/sanitize.ts
import sanitizeHtml from 'sanitize-html';

export function sanitizeText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

export function validatePhoneFormat(phone: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phone);
}

export function validateHeight(height: number): boolean {
  return Number.isInteger(height) && height >= 130 && height <= 230;
}

export function validateBirthYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1970 && year <= 2010;
}
```

```typescript
// API Route에서 사용
import { sanitizeText, validatePhoneFormat, validateHeight } from '@/lib/sanitize';

export async function POST(request: Request) {
  const body = await request.json();

  const nickname = sanitizeText(body.nickname);
  const charm = sanitizeText(body.charm);
  const datingStyle = sanitizeText(body.dating_style);

  if (!validatePhoneFormat(body.phone)) {
    return NextResponse.json({ error: '전화번호 형식 오류' }, { status: 400 });
  }
  if (!validateHeight(body.height)) {
    return NextResponse.json({ error: '키 범위 오류 (130~230)' }, { status: 400 });
  }
  // ...
}
```

- **검증 방법:** 닉네임에 `<script>alert(1)</script>` 입력 시 태그 제거 확인

---

### 점검 항목 4-2: 이미지 업로드 보안
- **위험도:** HIGH
- **현재 상태:** 최대 5장 업로드. MIME 검증, 크기 제한, EXIF 제거 미정의.
- **권장 조치:** MIME 화이트리스트, 5MB 제한, sharp로 EXIF/GPS 제거, 랜덤 파일명
- **구현 코드:**

```typescript
// src/lib/upload.ts
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const MIN_FILES = 2;

export async function processUpload(file: File): Promise<Buffer> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`허용되지 않는 파일 형식: ${file.type}`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error('파일 크기 초과 (최대 5MB)');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // EXIF/GPS 메타데이터 제거 + 리사이즈
  const processed = await sharp(buffer)
    .rotate() // EXIF orientation 적용 후 제거
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  return processed;
}

export function generateFileName(userId: string): string {
  return `profiles/${userId}/${randomUUID()}.jpg`;
}
```

- **검증 방법:** .exe를 .jpg로 변경하여 업로드 시 거부 확인, 업로드된 이미지 EXIF 데이터 없음 확인

---

### 점검 항목 4-3: 전화번호 DB CHECK constraint
- **위험도:** MEDIUM
- **현재 상태:** phone TEXT UNIQUE NOT NULL만 정의. 형식 제약 없음.
- **권장 조치:** DB 레벨에서도 정규식 CHECK 제약 추가
- **구현 코드:**

```sql
ALTER TABLE users ADD CONSTRAINT check_phone_format
  CHECK (phone ~ '^010-\d{4}-\d{4}$');

ALTER TABLE users ADD CONSTRAINT check_height_range
  CHECK (/* height는 profiles 테이블에 있으므로 해당 테이블에 적용 */);

-- male_profiles / female_profiles
ALTER TABLE male_profiles ADD CONSTRAINT check_male_height
  CHECK (height >= 130 AND height <= 230);

ALTER TABLE female_profiles ADD CONSTRAINT check_female_height
  CHECK (height >= 130 AND height <= 230);
```

- **검증 방법:** DB에 잘못된 형식 직접 INSERT 시 constraint 에러 확인

---

## [영역 5] Rate Limiting 및 남용 방지

### 점검 항목 5-1: API Rate Limiting
- **위험도:** HIGH
- **현재 상태:** Rate Limiting 미구현.
- **권장 조치:** Vercel Edge Middleware에서 IP 기반 분당 60회 제한
- **구현 코드:**

```typescript
// src/middleware.ts (rate limit 추가)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= limit;
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }
  return NextResponse.next();
}
```

> 참고: Vercel Edge는 stateless이므로 프로덕션에서는 Upstash Redis(@upstash/ratelimit) 사용 권장

- **검증 방법:** 1분 내 61번 API 호출 시 429 응답 확인

---

### 점검 항목 5-2: 로그인 시도 제한
- **위험도:** MEDIUM
- **현재 상태:** Google OAuth 사용이므로 직접적인 brute force 위험은 낮으나, OAuth 콜백 남용 가능.
- **권장 조치:** OAuth 콜백 호출 빈도 제한 (5분간 10회)
- **구현 코드:** 5-1의 rate limit에 `/api/auth/callback` 경로 별도 제한 추가
- **검증 방법:** 콜백 11회 연속 호출 시 429 확인

---

### 점검 항목 5-3: 매칭 요청 남용 방지
- **위험도:** MEDIUM
- **현재 상태:** 중복 요청 불가, 7일 쿨타임만 정의. 일일 횟수 제한 없음.
- **권장 조치:** 일일 매칭 요청 30건 제한, 동시 pending 상한 50건
- **구현 코드:**

```typescript
// src/lib/match-guard.ts
const DAILY_LIMIT = 30;
const MAX_PENDING = 50;

export async function canSendMatchRequest(supabase: any, femaleProfileId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: dailyCount } = await supabase
    .from('match_requests')
    .select('*', { count: 'exact', head: true })
    .eq('female_profile_id', femaleProfileId)
    .gte('requested_at', today.toISOString());

  if ((dailyCount || 0) >= DAILY_LIMIT) {
    return { allowed: false, reason: '일일 매칭 요청 한도 초과' };
  }

  const { count: pendingCount } = await supabase
    .from('match_requests')
    .select('*', { count: 'exact', head: true })
    .eq('female_profile_id', femaleProfileId)
    .eq('status', 'pending');

  if ((pendingCount || 0) >= MAX_PENDING) {
    return { allowed: false, reason: '대기 중인 매칭 요청이 너무 많습니다' };
  }

  return { allowed: true };
}
```

- **검증 방법:** 31번째 매칭 요청 시 거부 메시지 확인

---

### 점검 항목 5-4: 크론잡 CRON_SECRET 보호
- **위험도:** HIGH
- **현재 상태:** 크론잡 엔드포인트 보호 미정의.
- **권장 조치:** 모든 /api/cron/* 경로에 CRON_SECRET 검증
- **구현 코드:** 영역 2 점검 항목 2-3 참조 (동일 패턴)
- **검증 방법:** Authorization 헤더 없이 크론 API 호출 시 401 확인

---

## [영역 6] CSRF 및 웹 보안

### 점검 항목 6-1: 쿠키 보안 및 헤더
- **위험도:** HIGH
- **현재 상태:** 기본 Supabase Auth 쿠키 설정 사용.
- **권장 조치:** SameSite=Strict, Secure, HttpOnly + 보안 헤더 추가
- **구현 코드:**

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' blob: data: *.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

- **검증 방법:** 응답 헤더에 X-Frame-Options: DENY, HSTS 등 존재 확인

---

### 점검 항목 6-2: Supabase Storage Private 버킷
- **위험도:** HIGH
- **현재 상태:** 프로필 사진 Storage 버킷 접근 정책 미정의.
- **권장 조치:** Private 버킷 + signed URL (15분 만료) 사용
- **구현 코드:**

```typescript
// src/lib/storage.ts
export async function getSignedPhotoUrl(supabase: any, path: string) {
  const { data } = await supabase.storage
    .from('profile-photos') // private bucket
    .createSignedUrl(path, 900); // 15분

  return data?.signedUrl;
}

// Supabase Dashboard → Storage → profile-photos 버킷:
// Public: OFF
// RLS: INSERT는 인증된 사용자, SELECT는 signed URL로만
```

```sql
-- Storage RLS
CREATE POLICY storage_auth_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY storage_auth_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid() IS NOT NULL
  );
```

- **검증 방법:** Storage URL 직접 접근 시 401, signed URL로만 접근 가능 확인

---

### 점검 항목 6-3: 프로덕션 에러 응답
- **위험도:** MEDIUM
- **현재 상태:** 개발 중이므로 상세 에러 노출 가능성.
- **권장 조치:** 프로덕션에서 generic 에러 메시지만 반환
- **구현 코드:**

```typescript
// src/lib/api-error.ts
export function apiError(error: unknown, status = 500) {
  console.error('[API Error]', error);

  const message = process.env.NODE_ENV === 'production'
    ? '요청을 처리할 수 없습니다'
    : error instanceof Error ? error.message : String(error);

  return NextResponse.json({ error: message }, { status });
}
```

- **검증 방법:** 프로덕션 빌드에서 의도적 에러 발생 시 스택 트레이스 미노출 확인

---

## [영역 7] 법적 준수 및 운영 보안

### 점검 항목 7-1: 개인정보 수집/이용 동의
- **위험도:** CRITICAL
- **현재 상태:** 계약서 제13조에 개인정보 처리 책임은 "갑"에게 있다고 명시. 동의 이력 DB 미구현.
- **권장 조치:** 회원가입 시 개인정보 수집/이용 동의 체크박스 + 동의 이력 DB 저장
- **구현 코드:**

```sql
CREATE TABLE consent_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'privacy_policy', 'terms_of_service', 'marketing'
  consented  BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consent_logs_user ON consent_logs(user_id, consent_type);
```

- **검증 방법:** 회원가입 완료 후 consent_logs에 동의 이력 저장 확인

---

### 점검 항목 7-2: 회원 탈퇴 API
- **위험도:** HIGH
- **현재 상태:** 명세서에 탈퇴 기능 미정의. CASCADE 삭제는 DB 설계에 있음.
- **권장 조치:** 탈퇴 API 구현: DB cascade 삭제 + Storage 사진 삭제 + Auth 계정 삭제
- **구현 코드:**

```typescript
// src/app/api/account/delete/route.ts
export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceSupabase = createServiceRoleClient();

  // 1. Storage 사진 삭제
  const { data: files } = await serviceSupabase.storage
    .from('profile-photos')
    .list(`profiles/${user.id}`);

  if (files?.length) {
    await serviceSupabase.storage
      .from('profile-photos')
      .remove(files.map(f => `profiles/${user.id}/${f.name}`));
  }

  // 2. DB 삭제 (CASCADE로 연관 데이터 자동 삭제)
  await serviceSupabase.from('users').delete().eq('id', user.id);

  // 3. Auth 계정 삭제
  await serviceSupabase.auth.admin.deleteUser(user.id);

  return NextResponse.json({ success: true });
}
```

- **검증 방법:** 탈퇴 후 DB, Storage, Auth에서 해당 사용자 데이터 완전 삭제 확인

---

### 점검 항목 7-3: 관리자 행위 감사 로그
- **위험도:** HIGH
- **현재 상태:** admin_notes만 존재. 관리자 행위(승인/반려/차단/수정 등) 감사 로그 없음.
- **권장 조치:** admin_audit_logs 테이블 + 모든 관리자 API에 자동 기록
- **구현 코드:**

```sql
CREATE TABLE admin_audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID NOT NULL REFERENCES admins(id),
  action     TEXT NOT NULL,     -- 'approve_user', 'reject_user', 'block_user', 'edit_profile', 'create_md_recommendation', ...
  target_id  UUID,              -- 대상 user/profile ID
  details    JSONB,             -- 변경 전후 데이터
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_admin ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON admin_audit_logs(target_id, created_at DESC);
```

```typescript
// src/lib/audit.ts
export async function logAdminAction(
  supabase: any,
  adminId: string,
  action: string,
  targetId: string,
  details: Record<string, unknown>,
  ip: string
) {
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_id: targetId,
    details,
    ip_address: ip,
  });
}

// 사용 예시: 회원 승인 시
await logAdminAction(supabase, adminId, 'approve_user', userId, {
  previous_status: 'pending',
  new_status: 'active',
}, ip);
```

- **검증 방법:** 관리자 승인/반려/차단 등 행위 후 admin_audit_logs 레코드 확인

---

## 최종 요약 테이블

| # | 점검 항목 | 위험도 | 현재 상태 | 조치 |
|---|-----------|--------|-----------|------|
| 1-1 | 관리자 MFA | CRITICAL | 미구현 | Supabase MFA 활성화 + middleware 강제 |
| 1-2 | 세션 관리 정책 | HIGH | 기본값 사용 | JWT 15분 + Refresh 7일 + global signout |
| 1-3 | IDOR 방어 | CRITICAL | 텍스트만 정의 | 서버사이드 auth-guard 미들웨어 |
| 1-4 | 관리자 IP 로깅 | MEDIUM | 미구현 | admin_login_logs + 새 IP 알림 |
| 2-1 | 토큰 생성 보안 | HIGH | 방식 미정의 | 256bit 랜덤 + 접근 횟수 제한 |
| 2-2 | 링크 접근 제한 | HIGH | 무제한 | 최대 10회 + IP 로깅 |
| 2-3 | 만료 토큰 삭제 | LOW | 미구현 | 일일 크론잡 |
| 3-1 | RLS 정책 | CRITICAL | admin_notes만 | 전체 테이블 RLS 적용 |
| 3-2 | SQL Injection | HIGH | Raw SQL 사용 | Parameterized Query 강제 |
| 3-3 | 민감 데이터 암호화 | HIGH | 평문 저장 | AES-256-GCM 암호화 |
| 4-1 | XSS 방지 | HIGH | 미구현 | sanitize-html + 프론트 이스케이프 |
| 4-2 | 이미지 업로드 | HIGH | 미구현 | MIME 검증 + EXIF 제거 + 5MB 제한 |
| 4-3 | 전화번호 CHECK | MEDIUM | 미구현 | DB CHECK constraint |
| 5-1 | API Rate Limit | HIGH | 미구현 | Edge middleware + Upstash Redis |
| 5-2 | 로그인 시도 제한 | MEDIUM | OAuth라 낮음 | 콜백 빈도 제한 |
| 5-3 | 매칭 요청 제한 | MEDIUM | 쿨타임만 | 일일 30건 + pending 50건 |
| 5-4 | 크론잡 보호 | HIGH | 미구현 | CRON_SECRET 검증 |
| 6-1 | 쿠키/헤더 보안 | HIGH | 기본값 | SameSite + 보안 헤더 |
| 6-2 | Storage 접근 | HIGH | 미정의 | Private 버킷 + signed URL |
| 6-3 | 에러 응답 | MEDIUM | 개발 중 | 프로덕션 generic 에러 |
| 7-1 | 개인정보 동의 | CRITICAL | 미구현 | consent_logs 테이블 + UI |
| 7-2 | 회원 탈퇴 | HIGH | 미정의 | CASCADE + Storage + Auth 삭제 |
| 7-3 | 감사 로그 | HIGH | 미구현 | admin_audit_logs + 자동 기록 |

---

**우선순위 권장 순서:**
1. CRITICAL (즉시): RLS 전체 적용, IDOR 방어, 관리자 MFA, 개인정보 동의
2. HIGH (1주 내): 세션 정책, 토큰 보안, 암호화, XSS 방지, 이미지 보안, Rate Limit, 보안 헤더, Storage, 크론잡, 감사 로그, 탈퇴 API
3. MEDIUM (2주 내): IP 로깅, CHECK constraint, 로그인 제한, 매칭 제한, 에러 응답
4. LOW (월간): 만료 토큰 정리
