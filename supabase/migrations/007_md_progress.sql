-- =====================================================================
-- 007_md_progress.sql
-- MD추천(남성 선픽) 진행 단계 추적용 스키마 업데이트
--   남성이 MD추천을 "수락"한 뒤, 운영진(모두의소개팅 직원)이 손으로 진행하는
--   단계들을 버튼 클릭으로 기록한다.
--
--   link_sent_at        : 직원이 여성에게 남성 프로필 링크를 전달 완료한 시각 (내부 기록용)
--   female_approved_at  : 여성이 승낙한 시각 (남자 화면에 "수락완료" 7일 노출)
--   female_rejected_at  : 여성이 거절한 시각 (남자 화면에 "거절" 7일 노출)
--   completed_at        : 연락처 교환/카톡방 개설 완료 시각 (남자 화면에 "매칭완료" 7일 노출)
--
--   female_approved_at 과 female_rejected_at 은 상호배타 (둘 중 하나만 기록됨)
--   NULL = 아직 해당 단계 처리 안 함
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- =====================================================================

BEGIN;

ALTER TABLE md_recommendations
  ADD COLUMN IF NOT EXISTS link_sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS female_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS female_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at       TIMESTAMPTZ;

COMMIT;
