-- =====================================================================
-- 005_profile_links.sql
-- 프로필 공유 링크를 인메모리 store 대신 DB에 영구 저장
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- =====================================================================

CREATE TABLE IF NOT EXISTS profile_links (
  token        TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  access_count INT NOT NULL DEFAULT 0,
  max_access   INT NOT NULL DEFAULT 10
);

-- 만료된 링크 자동 정리를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_profile_links_expires_at ON profile_links (expires_at);
CREATE INDEX IF NOT EXISTS idx_profile_links_user_id   ON profile_links (user_id);

-- RLS: 서비스 키(service_role)만 접근, 일반 anon/user는 차단
ALTER TABLE profile_links ENABLE ROW LEVEL SECURITY;

-- 관리자(service role)만 INSERT/UPDATE/SELECT 가능 (API에서 service client 사용)
-- anon / authenticated role 은 이 테이블에 직접 접근 불가
