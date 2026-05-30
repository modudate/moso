-- =====================================================================
-- 008_perf_nickname.sql
-- 오픈(대량 동시접속) 대비 성능 개선
--   1) users(role, status) 복합 인덱스
--      갤러리/카트/요청함의 "active + role" 목록 조회를 인덱스로 가속.
--      (기존에는 전체 users 풀스캔 후 애플리케이션에서 필터)
--   2) is_nickname_taken(p_nickname, p_exclude) RPC
--      닉네임 중복체크를 lower(trim(nickname)) 표현식 인덱스
--      (004 의 idx_profiles_nickname_normalized)를 타도록 한다.
--      기존 ilike 방식은 인덱스를 못 타고 매번 풀스캔이었음.
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. active 갤러리 조회 가속용 복합 인덱스
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);

-- ─────────────────────────────────────────────────────────────────────
-- 2. 닉네임 중복체크 RPC (표현식 인덱스 활용)
--    · lower(trim(nickname)) = lower(trim(p_nickname)) 로 비교 → 인덱스 사용
--    · p_exclude 가 주어지면 본인(user_id)은 중복에서 제외 (재제출 대비)
--    · SECURITY DEFINER: RLS 우회 (전체 닉네임 대상 정확 검사 필요)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_nickname_taken(p_nickname text, p_exclude uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE lower(trim(nickname)) = lower(trim(p_nickname))
      AND (p_exclude IS NULL OR user_id <> p_exclude)
  );
$$;

-- anon/authenticated 모두 호출 가능하도록 권한 부여
-- (앱은 service_role 로 호출하지만, 명시적으로 실행권한을 부여해 둔다)
GRANT EXECUTE ON FUNCTION is_nickname_taken(text, uuid) TO anon, authenticated, service_role;

COMMIT;
