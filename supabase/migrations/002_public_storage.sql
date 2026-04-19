-- =====================================================================
-- 002_public_storage.sql
-- profile-photos 버킷을 Public으로 전환 + 기존 signed URL → public URL 변환
-- =====================================================================
--
-- 배경: 초기 설계는 Private 버킷 + signed URL이었으나,
-- signed URL에 만료시간(3600s)이 있어 시간이 지나면 이미지가 깨짐.
-- 프로필 사진은 이미 가입자 간 상호 공개가 전제이므로 Public 전환.
--
-- Supabase Dashboard > Storage > profile-photos 에서
-- "Public bucket" 옵션을 켜는 것과 동일한 효과.
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- =====================================================================

-- 1) 버킷을 Public으로
UPDATE storage.buckets
SET public = true
WHERE id = 'profile-photos';

-- 2) 기존 DB에 저장된 signed URL 을 public URL 형태로 치환
--    (URL 패턴)  /object/sign/ ... ?token=xxx  →  /object/public/ ...
--
--    charm_photo / date_photo 는 단일 TEXT
UPDATE profiles
SET charm_photo = regexp_replace(
  replace(charm_photo, '/object/sign/', '/object/public/'),
  '\?token=[^&]+',
  '',
  'g'
)
WHERE charm_photo LIKE '%/object/sign/%';

UPDATE profiles
SET date_photo = regexp_replace(
  replace(date_photo, '/object/sign/', '/object/public/'),
  '\?token=[^&]+',
  '',
  'g'
)
WHERE date_photo LIKE '%/object/sign/%';

-- 3) photo_urls 는 TEXT[] 배열 — 각 요소별로 변환
UPDATE profiles
SET photo_urls = ARRAY(
  SELECT regexp_replace(
    replace(u, '/object/sign/', '/object/public/'),
    '\?token=[^&]+',
    '',
    'g'
  )
  FROM unnest(photo_urls) AS u
)
WHERE EXISTS (
  SELECT 1 FROM unnest(photo_urls) AS u WHERE u LIKE '%/object/sign/%'
);
