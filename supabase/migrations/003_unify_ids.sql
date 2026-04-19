-- =====================================================================
-- 003_unify_ids.sql
-- match_requests / cart_items / rejection_logs / md_recommendations 의
-- male_profile_id / female_profile_id 를 profiles(id) → users(id) 참조로 변경.
--
-- 배경: 앱의 user-profile 관계가 1:1 이고, 프론트/API는 모두 users.id 로
-- 동작하고 있으나 FK 가 profiles.id 를 참조해 INSERT 시 FK 위반이 발생.
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. FK 제약 제거
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE match_requests       DROP CONSTRAINT IF EXISTS match_requests_male_profile_id_fkey;
ALTER TABLE match_requests       DROP CONSTRAINT IF EXISTS match_requests_female_profile_id_fkey;
ALTER TABLE cart_items           DROP CONSTRAINT IF EXISTS cart_items_male_profile_id_fkey;
ALTER TABLE cart_items           DROP CONSTRAINT IF EXISTS cart_items_female_profile_id_fkey;
ALTER TABLE rejection_logs       DROP CONSTRAINT IF EXISTS rejection_logs_male_profile_id_fkey;
ALTER TABLE rejection_logs       DROP CONSTRAINT IF EXISTS rejection_logs_female_profile_id_fkey;
ALTER TABLE md_recommendations   DROP CONSTRAINT IF EXISTS md_recommendations_male_profile_id_fkey;
ALTER TABLE md_recommendations   DROP CONSTRAINT IF EXISTS md_recommendations_female_profile_id_fkey;

-- ─────────────────────────────────────────────────────────────────────
-- 2. 기존 데이터 변환 profiles.id → users.id
--    (profiles.id 로 저장된 값을 user_id 로 치환)
-- ─────────────────────────────────────────────────────────────────────
UPDATE match_requests mr
SET male_profile_id = p.user_id
FROM profiles p
WHERE p.id = mr.male_profile_id;

UPDATE match_requests mr
SET female_profile_id = p.user_id
FROM profiles p
WHERE p.id = mr.female_profile_id;

UPDATE cart_items c
SET male_profile_id = p.user_id
FROM profiles p
WHERE p.id = c.male_profile_id;

UPDATE cart_items c
SET female_profile_id = p.user_id
FROM profiles p
WHERE p.id = c.female_profile_id;

UPDATE rejection_logs r
SET male_profile_id = p.user_id
FROM profiles p
WHERE p.id = r.male_profile_id;

UPDATE rejection_logs r
SET female_profile_id = p.user_id
FROM profiles p
WHERE p.id = r.female_profile_id;

UPDATE md_recommendations m
SET male_profile_id = p.user_id
FROM profiles p
WHERE p.id = m.male_profile_id;

UPDATE md_recommendations m
SET female_profile_id = p.user_id
FROM profiles p
WHERE p.id = m.female_profile_id;

-- ─────────────────────────────────────────────────────────────────────
-- 3. users(id) 로 FK 재생성
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE match_requests
  ADD CONSTRAINT match_requests_male_profile_id_fkey
    FOREIGN KEY (male_profile_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT match_requests_female_profile_id_fkey
    FOREIGN KEY (female_profile_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_male_profile_id_fkey
    FOREIGN KEY (male_profile_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT cart_items_female_profile_id_fkey
    FOREIGN KEY (female_profile_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE rejection_logs
  ADD CONSTRAINT rejection_logs_male_profile_id_fkey
    FOREIGN KEY (male_profile_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT rejection_logs_female_profile_id_fkey
    FOREIGN KEY (female_profile_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE md_recommendations
  ADD CONSTRAINT md_recommendations_male_profile_id_fkey
    FOREIGN KEY (male_profile_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT md_recommendations_female_profile_id_fkey
    FOREIGN KEY (female_profile_id) REFERENCES users(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RLS 정책 갱신
--    기존: female_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
--    이후: female_profile_id = auth.uid()
-- ─────────────────────────────────────────────────────────────────────

-- cart_items
DROP POLICY IF EXISTS cart_items_policy ON cart_items;
CREATE POLICY cart_items_policy ON cart_items FOR ALL USING (
  is_admin() OR female_profile_id = auth.uid()
) WITH CHECK (
  is_admin() OR female_profile_id = auth.uid()
);

-- match_requests
DROP POLICY IF EXISTS match_requests_read   ON match_requests;
DROP POLICY IF EXISTS match_requests_insert ON match_requests;
DROP POLICY IF EXISTS match_requests_update ON match_requests;

CREATE POLICY match_requests_read ON match_requests FOR SELECT USING (
  is_admin() OR female_profile_id = auth.uid() OR male_profile_id = auth.uid()
);
CREATE POLICY match_requests_insert ON match_requests FOR INSERT WITH CHECK (
  female_profile_id = auth.uid()
);
CREATE POLICY match_requests_update ON match_requests FOR UPDATE USING (
  is_admin() OR male_profile_id = auth.uid()
) WITH CHECK (
  is_admin() OR male_profile_id = auth.uid()
);

-- rejection_logs
DROP POLICY IF EXISTS rejection_logs_admin  ON rejection_logs;
DROP POLICY IF EXISTS rejection_logs_read   ON rejection_logs;
DROP POLICY IF EXISTS rejection_logs_insert ON rejection_logs;

CREATE POLICY rejection_logs_read ON rejection_logs FOR SELECT USING (
  is_admin() OR female_profile_id = auth.uid() OR male_profile_id = auth.uid()
);
CREATE POLICY rejection_logs_insert ON rejection_logs FOR INSERT WITH CHECK (
  is_admin() OR male_profile_id = auth.uid()
);
CREATE POLICY rejection_logs_admin ON rejection_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- md_recommendations
DROP POLICY IF EXISTS md_recs_read        ON md_recommendations;
DROP POLICY IF EXISTS md_recs_admin_write ON md_recommendations;

CREATE POLICY md_recs_read ON md_recommendations FOR SELECT USING (
  is_admin() OR male_profile_id = auth.uid()
);
CREATE POLICY md_recs_admin_write ON md_recommendations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

COMMIT;
