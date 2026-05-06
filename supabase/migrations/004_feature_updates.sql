-- =====================================================================
-- 004_feature_updates.sql
-- 추가 기능 요청에 따른 스키마 업데이트
--   1) users.rejection_reason: 신청자 반려 시 사유 저장
--   2) ideal_types.ideal_age_ranges: 선호 나이 다중 선택 지원 (TEXT[])
--      기존 ideal_age_range (TEXT) 단일값은 호환을 위해 유지하되,
--      ideal_age_ranges 가 비어있을 때만 fallback 으로 사용.
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. users.rejection_reason
--    신청자 반려 시 관리자가 입력하는 사유 (선택)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- 2. ideal_types.ideal_age_ranges
--    여성 가입 시 선호 나이를 다중 선택할 수 있도록 배열 컬럼 추가
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE ideal_types
  ADD COLUMN IF NOT EXISTS ideal_age_ranges TEXT[] DEFAULT '{}';

-- 기존 단일값을 배열로 백필 (NULL/빈문자 제외)
UPDATE ideal_types
SET ideal_age_ranges = ARRAY[ideal_age_range]
WHERE (ideal_age_ranges IS NULL OR array_length(ideal_age_ranges, 1) IS NULL)
  AND ideal_age_range IS NOT NULL
  AND length(ideal_age_range) > 0;

-- ─────────────────────────────────────────────────────────────────────
-- 3. profiles.nickname 유니크 인덱스 (대소문자/공백 통일)
--    닉네임 중복체크 성능을 위해 lower(trim(nickname)) 인덱스 추가.
--    중복 데이터가 있을 수 있으므로 UNIQUE 제약 대신 일반 인덱스로 둠.
--    (실제 중복체크는 애플리케이션 레벨에서 수행)
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_nickname_normalized
  ON profiles ((lower(trim(nickname))));

COMMIT;
