-- =====================================================================
-- 승인 시점 기록용 컬럼 추가
-- 관리자가 회원을 승인한 시점을 기록하여, 신규 가입자 정렬에 사용
-- =====================================================================

-- users 테이블에 approved_at 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 기존 active 회원들은 created_at 을 approved_at 으로 복사 (폴백용)
UPDATE users
SET approved_at = created_at
WHERE status = 'active' AND approved_at IS NULL;

-- 인덱스 추가 (갤러리 정렬용)
CREATE INDEX IF NOT EXISTS idx_users_approved_at ON users(approved_at DESC NULLS LAST);
