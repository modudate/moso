-- =====================================================================
-- 006_match_completed_at.sql
-- 관리자 매칭완료 처리 기능을 위한 스키마 업데이트
--   match_requests 테이블에 completed_at 컬럼 추가.
--   관리자가 실제로 카카오톡 채팅방에 초대한 후 "매칭완료" 버튼을 누르면
--   이 컬럼에 시각이 기록됨.
--   NULL = 아직 관리자가 완료처리 안 함 (매칭마무리필요 상태)
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- =====================================================================

BEGIN;

ALTER TABLE match_requests
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMIT;
