import { createServiceClient } from "@/lib/supabase/server";

// 서버 사이드 전용 DB 유틸리티
// service_role 키를 사용하여 RLS를 우회 (관리자 API 등에서 사용)

export async function getDb() {
  return createServiceClient();
}

// ── Users ──────────────────────────────────────────────────────────

export async function getAllUsers() {
  const db = await getDb();
  const { data } = await db
    .from("users")
    .select("*, profiles(*)")
    .order("approved_at", { ascending: false, nullsFirst: false });
  return (data || []).map(mapUserWithProfile);
}

export async function getUserById(id: string) {
  const db = await getDb();
  const { data } = await db
    .from("users")
    .select("*, profiles(*)")
    .eq("id", id)
    .single();
  return data ? mapUserWithProfile(data) : null;
}

// ── 갤러리 목록 (active + role 서버 필터 + 카드용 컬럼만) ──────────────
// 갤러리/카트/요청함 등 "이성 active 목록"이 필요한 화면 전용.
// 전체 users 를 풀스캔하던 getAllUsers 대신, DB 에서 role+status 로 필터하고
// 카드 렌더/필터에 필요한 컬럼만 가져온다. (charm/datingStyle/추가사진 등 무거운 필드 제외)
// 사진은 카드에 첫 장만 쓰이므로 photo_urls 도 첫 장만 내려보낸다.
const PROFILE_CARD_SELECT =
  "id, role, status, profiles!inner(nickname, birth_year, height, city, district, workplace, job, work_pattern, salary, education, smoking, mbti, photo_urls)";

export async function getActiveProfilesByRole(role: "male" | "female") {
  const db = await getDb();
  const { data } = await db
    .from("users")
    .select(PROFILE_CARD_SELECT)
    .eq("role", role)
    .eq("status", "active")
    .order("approved_at", { ascending: false, nullsFirst: false });
  return (data || []).map(mapProfileCard);
}

// ── 공개 프로필 단건 조회 ────────────────────────────────────────────
// 상세 페이지(이성 1명 보기)/내 프로필 미리보기에서 사용.
// 전체 목록을 받아 find 하던 패턴을 제거하기 위한 단건 조회.
// 민감 필드(phone/email/realName/반려사유)는 제외하고 반환한다.
export async function getPublicProfileById(id: string) {
  const db = await getDb();
  const { data } = await db
    .from("users")
    .select("id, role, status, profiles!inner(*)")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const full = mapUserWithProfile(data);
  const {
    phone: _phone,
    email: _email,
    realName: _realName,
    rejectionReason: _rejectionReason,
    ...pub
  } = full;
  void _phone; void _email; void _realName; void _rejectionReason;
  return pub;
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const db = await getDb();
  const dbUpdates: Record<string, unknown> = {};

  const fieldMap: Record<string, string> = {
    realName: "real_name", nickname: "nickname", birthYear: "birth_year",
    height: "height", city: "city", district: "district", workplace: "workplace",
    job: "job", workPattern: "work_pattern", salary: "salary", education: "education",
    smoking: "smoking", mbti: "mbti", charm: "charm", datingStyle: "dating_style",
    photoUrls: "photo_urls", charmPhoto: "charm_photo", datePhoto: "date_photo",
    expiresAt: "expires_at",
  };

  const isBlob = (s: unknown) => typeof s === "string" && s.startsWith("blob:");

  for (const [key, val] of Object.entries(updates)) {
    if (key === "status") {
      // 반려 사유와 함께 상태 변경하는 경우는 별도 키(rejectionReason)로 들어옴
      const userPatch: Record<string, unknown> = { status: val };
      // 반려가 아닌 상태로 전환할 때는 사유 초기화
      if (val !== "rejected" && updates.rejectionReason === undefined) {
        userPatch.rejection_reason = null;
      }
      // 승인(active) 시 approved_at 기록 (신규 가입자 정렬용)
      if (val === "active") {
        userPatch.approved_at = new Date().toISOString();
      }
      const { error } = await db.from("users").update(userPatch).eq("id", userId);
      if (error) throw new Error(`status 업데이트 실패: ${error.message}`);
      continue;
    }
    if (key === "rejectionReason") {
      const { error } = await db.from("users").update({ rejection_reason: val }).eq("id", userId);
      if (error) throw new Error(`rejectionReason 업데이트 실패: ${error.message}`);
      continue;
    }
    const dbKey = fieldMap[key];
    if (!dbKey) continue;

    // blob: URL 방어 - 업로드 미완료/실패 상태 URL 을 DB 에 절대 저장 금지
    if (key === "photoUrls" && Array.isArray(val)) {
      dbUpdates[dbKey] = val.filter(u => typeof u === "string" && !isBlob(u));
    } else if ((key === "charmPhoto" || key === "datePhoto") && isBlob(val)) {
      continue;
    } else {
      dbUpdates[dbKey] = val;
    }
  }

  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await db.from("profiles").update(dbUpdates).eq("user_id", userId);
    if (error) throw new Error(`프로필 업데이트 실패: ${error.message}`);
  }
}

// ── Nickname 중복 체크 ─────────────────────────────────────────────
// 대소문자/앞뒤 공백 무시. excludeUserId 가 주어지면 본인 닉네임은 제외하고 검사.
export async function isNicknameTaken(nickname: string, excludeUserId?: string): Promise<boolean> {
  const trimmed = nickname.trim();
  if (!trimmed) return false;
  const db = await getDb();

  // 1) 인덱스를 타는 RPC 우선 사용 (migration 008 의 is_nickname_taken).
  //    lower(trim(nickname)) 표현식 인덱스(idx_profiles_nickname_normalized)를 활용한다.
  const { data, error } = await db.rpc("is_nickname_taken", {
    p_nickname: trimmed,
    p_exclude: excludeUserId ?? null,
  });
  if (!error) return !!data;

  // 2) RPC 미적용(마이그레이션 전) 환경 폴백 — 기존 방식
  const normalized = trimmed.toLowerCase();
  const { data: rows } = await db
    .from("profiles")
    .select("user_id, nickname")
    .ilike("nickname", normalized);
  if (!rows) return false;
  return rows.some((row: { user_id: string; nickname: string }) => {
    if (row.nickname.trim().toLowerCase() !== normalized) return false;
    if (excludeUserId && row.user_id === excludeUserId) return false;
    return true;
  });
}

// ── Ideal Types ────────────────────────────────────────────────────

function mapIdealType(data: Record<string, unknown>) {
  const rangesRaw = data.ideal_age_ranges as string[] | null | undefined;
  const single = (data.ideal_age_range as string | null | undefined) ?? "";
  // 다중값이 비어있으면 단일값을 배열로 fallback
  const ranges = (rangesRaw && rangesRaw.length > 0) ? rangesRaw : (single ? [single] : []);
  return {
    userId: data.user_id as string,
    idealAge: single,
    idealAgeRanges: ranges,
    idealMinHeight: data.min_height as number,
    idealMaxHeight: data.max_height as number,
    idealCities: (data.cities as string[]) || [],
    idealWorkplaces: (data.workplaces as string[]) || [],
    idealJobs: (data.jobs as string[]) || [],
    idealSalaries: (data.salaries as string[]) || [],
    idealEducation: (data.education as string[]) || [],
    idealSmoking: data.ideal_smoking as boolean | null,
    idealMbti: (data.ideal_mbti as string[]) || [],
    topPriorities: (data.top_priorities as string[]) || [],
  };
}

export async function getIdealType(userId: string) {
  const db = await getDb();
  const { data } = await db
    .from("ideal_types")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (!data) return null;
  return mapIdealType(data);
}

export async function getAllIdealTypes() {
  const db = await getDb();
  const { data } = await db.from("ideal_types").select("*");
  return (data || []).map(mapIdealType);
}

// ── Match Requests ─────────────────────────────────────────────────

export async function getMatchRequests(filters?: { maleId?: string; femaleId?: string }) {
  const db = await getDb();
  let query = db.from("match_requests").select("*");
  if (filters?.maleId) query = query.eq("male_profile_id", filters.maleId);
  if (filters?.femaleId) query = query.eq("female_profile_id", filters.femaleId);
  const { data } = await query.order("requested_at", { ascending: false });
  return (data || []).map(mapMatchRequest);
}

export async function getAllMatchRequests() {
  const db = await getDb();
  const { data } = await db.from("match_requests").select("*").order("requested_at", { ascending: false });
  return (data || []).map(mapMatchRequest);
}

// ── MD Recommendations ─────────────────────────────────────────────

export async function getMdRecsForMale(maleProfileId: string) {
  const db = await getDb();
  const { data } = await db
    .from("md_recommendations")
    .select("*")
    .eq("male_profile_id", maleProfileId)
    .order("created_at", { ascending: false });
  return (data || []).map(mapMdRec);
}

export async function getMdRecsForFemale(femaleProfileId: string) {
  const db = await getDb();
  const { data } = await db
    .from("md_recommendations")
    .select("*")
    .eq("female_profile_id", femaleProfileId)
    .order("created_at", { ascending: false });
  return (data || []).map(mapMdRec);
}

export async function getAllMdRecommendations() {
  const db = await getDb();
  const { data } = await db
    .from("md_recommendations")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []).map(mapMdRec);
}

export async function addMdRecommendation(maleProfileId: string, femaleProfileId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("md_recommendations")
    .insert({ male_profile_id: maleProfileId, female_profile_id: femaleProfileId })
    .select()
    .single();
  if (error) throw error;
  return mapMdRec(data);
}

export async function deleteMdRecommendation(id: string) {
  const db = await getDb();
  const { error } = await db.from("md_recommendations").delete().eq("id", id);
  if (error) throw error;
}

export async function getMdRecById(id: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("md_recommendations")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return mapMdRec(data);
}

// MD추천 진행 단계 컬럼 업데이트 (관리자 전용)
export async function updateMdProgress(
  id: string,
  patch: Partial<{
    link_sent_at: string | null;
    female_approved_at: string | null;
    female_rejected_at: string | null;
    completed_at: string | null;
  }>,
) {
  const db = await getDb();
  const { data, error } = await db
    .from("md_recommendations")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("MD추천 업데이트 실패");
  return mapMdRec(data);
}

// ── Profile Links (프로필 공유 링크) ───────────────────────────────

export async function getProfileLinksByUser(userId: string) {
  const db = await getDb();
  const { data } = await db
    .from("profile_links")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  type ProfileLinkRow = {
    token: string;
    user_id: string;
    created_at: string;
    expires_at: string;
    access_count: number;
    max_access: number;
  };
  return ((data as ProfileLinkRow[]) || []).map((l) => ({
    token: l.token,
    userId: l.user_id,
    createdAt: l.created_at,
    expiresAt: l.expires_at,
    accessCount: l.access_count,
    maxAccess: l.max_access,
  }));
}

export async function deleteProfileLink(token: string) {
  const db = await getDb();
  const { error } = await db.from("profile_links").delete().eq("token", token);
  if (error) throw error;
}

// ── Admin Notes ────────────────────────────────────────────────────

export async function getAdminNotes(userId: string) {
  const db = await getDb();
  const { data } = await db
    .from("admin_notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []).map(n => ({
    id: n.id,
    userId: n.user_id,
    content: n.content,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));
}

export async function addAdminNote(userId: string, content: string) {
  const db = await getDb();
  const { data } = await db
    .from("admin_notes")
    .insert({ user_id: userId, content })
    .select()
    .single();
  return data;
}

export async function updateAdminNote(noteId: string, content: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("admin_notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAdminNote(noteId: string) {
  const db = await getDb();
  const { error } = await db.from("admin_notes").delete().eq("id", noteId);
  if (error) throw error;
}

// ── Cart Items ─────────────────────────────────────────────────────

export async function getCartItems(femaleProfileId: string) {
  const db = await getDb();
  const { data } = await db
    .from("cart_items")
    .select("*")
    .eq("female_profile_id", femaleProfileId)
    .order("added_at", { ascending: false });
  return data || [];
}

export async function addCartItem(femaleProfileId: string, maleProfileId: string) {
  const db = await getDb();
  const { error } = await db.from("cart_items").upsert(
    { female_profile_id: femaleProfileId, male_profile_id: maleProfileId },
    { onConflict: "female_profile_id,male_profile_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeCartItem(femaleProfileId: string, maleProfileId: string) {
  const db = await getDb();
  const { error } = await db.from("cart_items")
    .delete()
    .eq("female_profile_id", femaleProfileId)
    .eq("male_profile_id", maleProfileId);
  if (error) throw new Error(error.message);
}

// ── Rejection Logs (쿨타임) ────────────────────────────────────────
// (legacy) 거절 후 7일 쿨타임. 현재 정책상 "거절은 영구" 이므로
// 여성 측 필터에서는 더 이상 사용하지 않고, 남성 측 7일 번복 가능 기간 산정용으로만 의미가 남음.
export async function getCooldownMaleIds(femaleProfileId: string) {
  const db = await getDb();
  const { data } = await db
    .from("rejection_logs")
    .select("male_profile_id")
    .eq("female_profile_id", femaleProfileId)
    .gt("visible_after", new Date().toISOString());
  return (data || []).map(d => d.male_profile_id);
}

// ── 영구 잠금 (Lock) — 여성 → 남성 사이의 모든 이력 조회 ───────────────
// 정책:
//  · 한 번이라도 매칭요청을 보낸 적이 있는 (female, male) 쌍은
//    status(pending/approved/rejected) 와 무관하게 여성 측에서 **영구 잠금**.
//    → 갤러리에서 제외, 카트에 담기 차단, 매칭요청 POST 차단.
//  · MD 추천 영구 잠금 정책도 동일하게 (male, female) 쌍의 매칭/MD 이력으로 판단.
//
// 반환: 해당 여성이 이미 매칭요청을 보낸 남성 ID 들의 집합.
export async function getLockedMaleIdsForFemale(femaleProfileId: string): Promise<Set<string>> {
  const db = await getDb();
  const { data } = await db
    .from("match_requests")
    .select("male_profile_id")
    .eq("female_profile_id", femaleProfileId);
  return new Set((data || []).map((d) => d.male_profile_id as string));
}

// 단일 (female, male) 쌍의 잠금 사유 조회
//  - "lockable" 한 row 가 있으면 status 도 같이 알려줌 (UI 메시지용)
export async function findExistingMatch(femaleProfileId: string, maleProfileId: string) {
  const db = await getDb();
  const { data } = await db
    .from("match_requests")
    .select("id, status, requested_at, responded_at")
    .eq("female_profile_id", femaleProfileId)
    .eq("male_profile_id", maleProfileId)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        status: data.status as "pending" | "approved" | "rejected",
        requestedAt: data.requested_at as string,
        respondedAt: (data.responded_at as string | null) ?? null,
      }
    : null;
}

// MD 추천 영구 잠금 — (male, female) 쌍에 매칭요청 또는 MD 추천 row 가 이미 존재하면 잠금
export async function isMdLocked(
  maleProfileId: string,
  femaleProfileId: string,
): Promise<{ locked: boolean; reason?: "match" | "md"; status?: string }> {
  const db = await getDb();
  const [{ data: m }, { data: md }] = await Promise.all([
    db
      .from("match_requests")
      .select("status")
      .eq("male_profile_id", maleProfileId)
      .eq("female_profile_id", femaleProfileId)
      .maybeSingle(),
    db
      .from("md_recommendations")
      .select("status")
      .eq("male_profile_id", maleProfileId)
      .eq("female_profile_id", femaleProfileId)
      .maybeSingle(),
  ]);
  if (m) return { locked: true, reason: "match", status: m.status as string };
  if (md) return { locked: true, reason: "md", status: md.status as string };
  return { locked: false };
}

// 특정 남성에 대해, 이미 잠긴 (= 매칭/MD 이력이 있는) 여성 ID 들의 집합
// 관리자 MD 추천 모달의 후보에서 미리 제외할 때 사용.
export async function getLockedFemaleIdsForMale(maleProfileId: string): Promise<Set<string>> {
  const db = await getDb();
  const [{ data: matches }, { data: mds }] = await Promise.all([
    db.from("match_requests").select("female_profile_id").eq("male_profile_id", maleProfileId),
    db.from("md_recommendations").select("female_profile_id").eq("male_profile_id", maleProfileId),
  ]);
  const set = new Set<string>();
  for (const r of matches ?? []) set.add(r.female_profile_id as string);
  for (const r of mds ?? []) set.add(r.female_profile_id as string);
  return set;
}

// ── Auto Block (크론) ──────────────────────────────────────────────

export async function runAutoBlock() {
  const db = await getDb();
  const now = new Date().toISOString();
  const { data: expiredProfiles } = await db
    .from("profiles")
    .select("user_id")
    .lt("expires_at", now);

  if (expiredProfiles && expiredProfiles.length > 0) {
    const userIds = expiredProfiles.map(p => p.user_id);
    await db
      .from("users")
      .update({ status: "blocked" })
      .in("id", userIds)
      .eq("status", "active");
  }
}

// ── Profile Share Links ────────────────────────────────────────────

export async function createShareLink(userId: string, token: string, expiresAt: string) {
  const db = await getDb();
  await db.from("profile_share_links").insert({
    token,
    user_id: userId,
    expires_at: expiresAt,
    access_count: 0,
    max_access: 10,
  });
}

export async function getShareLink(token: string) {
  const db = await getDb();
  const { data } = await db
    .from("profile_share_links")
    .select("*")
    .eq("token", token)
    .single();
  return data;
}

export async function incrementShareLinkAccess(token: string) {
  const db = await getDb();
  await db.rpc("increment_share_link_access", { link_token: token });
}

// ── Mappers ────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
// 갤러리 카드용 경량 매퍼 (PROFILE_CARD_SELECT 와 짝)
function mapProfileCard(row: any) {
  const p = row.profiles?.[0] || row.profiles || {};
  const photos: string[] = Array.isArray(p.photo_urls) ? p.photo_urls : [];
  return {
    id: row.id,
    role: row.role,
    status: row.status,
    nickname: p.nickname || "",
    birthYear: p.birth_year || 0,
    height: p.height || 0,
    city: p.city || "",
    district: p.district || "",
    workplace: p.workplace || "",
    job: p.job || "",
    workPattern: p.work_pattern || "",
    salary: p.salary || "",
    education: p.education || "",
    smoking: p.smoking || false,
    mbti: p.mbti || "",
    // 카드에는 대표 사진 1장만 필요 → 페이로드 절감
    photoUrls: photos.length > 0 ? [photos[0]] : [],
  };
}

function mapUserWithProfile(row: any) {
  const p = row.profiles?.[0] || row.profiles || {};
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    rejectionReason: row.rejection_reason ?? null,
    realName: p.real_name || "",
    nickname: p.nickname || "",
    birthYear: p.birth_year || 0,
    height: p.height || 0,
    city: p.city || "",
    district: p.district || "",
    workplace: p.workplace || "",
    job: p.job || "",
    workPattern: p.work_pattern || "",
    salary: p.salary || "",
    education: p.education || "",
    smoking: p.smoking || false,
    mbti: p.mbti || "",
    charm: p.charm || "",
    datingStyle: p.dating_style || "",
    photoUrls: p.photo_urls || [],
    charmPhoto: p.charm_photo || null,
    datePhoto: p.date_photo || null,
    expiresAt: p.expires_at || null,
    profileId: p.id || null,
  };
}

function mapMatchRequest(row: any) {
  return {
    id: row.id,
    femaleProfileId: row.female_profile_id,
    maleProfileId: row.male_profile_id,
    status: row.status,
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
    completedAt: row.completed_at ?? null,
  };
}

function mapMdRec(row: any) {
  return {
    id: row.id,
    maleProfileId: row.male_profile_id,
    femaleProfileId: row.female_profile_id,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    linkSentAt: row.link_sent_at ?? null,
    femaleApprovedAt: row.female_approved_at ?? null,
    femaleRejectedAt: row.female_rejected_at ?? null,
    completedAt: row.completed_at ?? null,
  };
}
