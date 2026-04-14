-- =====================================================================
-- 모두의 모임 - 초기 DB 마이그레이션
-- Supabase SQL Editor에서 실행
-- =====================================================================

-- ── ENUM 타입 ───────────────────────────────────────────────────────

CREATE TYPE user_status AS ENUM ('pending', 'active', 'blocked', 'rejected');
CREATE TYPE user_role   AS ENUM ('male', 'female');
CREATE TYPE match_status AS ENUM ('pending', 'approved', 'rejected');

-- ── 인증 ────────────────────────────────────────────────────────────

CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  phone      TEXT UNIQUE NOT NULL,
  role       user_role NOT NULL,
  status     user_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id, email, phone)
);

CREATE TABLE admins (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 프로필 (남녀 통합 → profiles 단일 테이블) ──────────────────────
-- ENUM 대신 TEXT를 사용하여 옵션 변경에 유연하게 대응

CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  real_name     TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  birth_year    INT NOT NULL CHECK (birth_year BETWEEN 1950 AND 2010),
  height        INT NOT NULL CHECK (height BETWEEN 130 AND 230),
  city          TEXT NOT NULL,
  district      TEXT NOT NULL DEFAULT '',
  workplace     TEXT NOT NULL,
  job           TEXT NOT NULL,
  work_pattern  TEXT NOT NULL DEFAULT '일반 직장인 패턴',
  salary        TEXT NOT NULL,
  education     TEXT NOT NULL,
  smoking       BOOLEAN NOT NULL DEFAULT false,
  mbti          TEXT NOT NULL,
  charm         TEXT NOT NULL DEFAULT '',
  dating_style  TEXT NOT NULL DEFAULT '',
  photo_urls    TEXT[] NOT NULL DEFAULT '{}',
  charm_photo   TEXT,
  date_photo    TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 이상형 ──────────────────────────────────────────────────────────

CREATE TABLE ideal_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ideal_age_range TEXT,
  min_height      INT,
  max_height      INT,
  cities          TEXT[] DEFAULT '{}',
  workplaces      TEXT[] DEFAULT '{}',
  jobs            TEXT[] DEFAULT '{}',
  salaries        TEXT[] DEFAULT '{}',
  education       TEXT[] DEFAULT '{}',
  ideal_smoking   BOOLEAN,
  ideal_mbti      TEXT[] DEFAULT '{}',
  top_priorities  TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 장바구니 ────────────────────────────────────────────────────────

CREATE TABLE cart_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  female_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  male_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (female_profile_id, male_profile_id)
);

-- ── 매칭 요청 ───────────────────────────────────────────────────────

CREATE TABLE match_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  female_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  male_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            match_status NOT NULL DEFAULT 'pending',
  requested_at      TIMESTAMPTZ DEFAULT now(),
  responded_at      TIMESTAMPTZ,
  UNIQUE (female_profile_id, male_profile_id)
);

-- ── 거절 로그 (7일 쿨타임) ──────────────────────────────────────────

CREATE TABLE rejection_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  male_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  female_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rejected_at       TIMESTAMPTZ DEFAULT now(),
  visible_after     TIMESTAMPTZ,
  UNIQUE (male_profile_id, female_profile_id)
);

-- visible_after 자동 설정 트리거
CREATE OR REPLACE FUNCTION set_visible_after()
RETURNS TRIGGER AS $$
BEGIN
  NEW.visible_after := NEW.rejected_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rejection_visible_after
  BEFORE INSERT OR UPDATE ON rejection_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_visible_after();

-- ── MD 추천 ─────────────────────────────────────────────────────────

CREATE TABLE md_recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  male_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  female_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            match_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT now(),
  responded_at      TIMESTAMPTZ,
  UNIQUE (male_profile_id, female_profile_id)
);

-- ── 관리자 메모 ─────────────────────────────────────────────────────

CREATE TABLE admin_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 프로필 공유 링크 ────────────────────────────────────────────────

CREATE TABLE profile_share_links (
  token        TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  access_count INT DEFAULT 0,
  max_access   INT DEFAULT 10
);

-- =====================================================================
-- RLS (Row Level Security)
-- =====================================================================

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideal_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rejection_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_share_links ENABLE ROW LEVEL SECURITY;

-- 관리자 확인 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- users: 본인 읽기 + 관리자 전체
CREATE POLICY users_self_read ON users FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY users_admin_write ON users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- profiles: active 유저끼리 읽기 + 관리자 전체
CREATE POLICY profiles_read ON profiles FOR SELECT USING (
  is_admin() OR (
    user_id = auth.uid()
  ) OR (
    user_id IN (SELECT id FROM users WHERE status = 'active')
    AND auth.uid() IN (SELECT id FROM users WHERE status = 'active')
  )
);
CREATE POLICY profiles_self_insert ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_admin_write ON profiles FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY profiles_self_update ON profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ideal_types: 본인 + 관리자
CREATE POLICY ideal_types_read ON ideal_types FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY ideal_types_self_insert ON ideal_types FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY ideal_types_admin_write ON ideal_types FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- cart_items: 여성 본인 + 관리자
CREATE POLICY cart_items_policy ON cart_items FOR ALL USING (
  is_admin() OR female_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- match_requests: 관련 유저 + 관리자
CREATE POLICY match_requests_read ON match_requests FOR SELECT USING (
  is_admin() OR
  female_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  male_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY match_requests_insert ON match_requests FOR INSERT WITH CHECK (
  female_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY match_requests_update ON match_requests FOR UPDATE USING (
  is_admin() OR male_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- rejection_logs: 관리자만 직접 접근
CREATE POLICY rejection_logs_admin ON rejection_logs FOR ALL USING (is_admin());

-- md_recommendations: 관련 남성 읽기 + 관리자 전체
CREATE POLICY md_recs_read ON md_recommendations FOR SELECT USING (
  is_admin() OR male_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY md_recs_admin_write ON md_recommendations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- admin_notes: 관리자만
CREATE POLICY admin_notes_policy ON admin_notes FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- profile_share_links: 관리자 + service_role
CREATE POLICY share_links_admin ON profile_share_links FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- =====================================================================
-- 인덱스
-- =====================================================================

CREATE INDEX idx_profiles_user_id    ON profiles(user_id);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX idx_users_status        ON users(status);
CREATE INDEX idx_profiles_expires_at ON profiles(expires_at);
CREATE INDEX idx_rejection_logs_female ON rejection_logs(female_profile_id, visible_after);
CREATE INDEX idx_match_requests_male   ON match_requests(male_profile_id, status);
CREATE INDEX idx_match_requests_female ON match_requests(female_profile_id, status);
CREATE INDEX idx_cart_items_female      ON cart_items(female_profile_id);
CREATE INDEX idx_md_recs_male          ON md_recommendations(male_profile_id, status);
CREATE INDEX idx_admin_notes_user      ON admin_notes(user_id, created_at DESC);

-- =====================================================================
-- Storage 버킷
-- =====================================================================
-- Supabase Dashboard > Storage에서 수동 생성:
-- 버킷명: profile-photos
-- Public: false (Private)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
