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
    .order("created_at", { ascending: false });
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

  for (const [key, val] of Object.entries(updates)) {
    if (key === "status") {
      await db.from("users").update({ status: val }).eq("id", userId);
      continue;
    }
    const dbKey = fieldMap[key];
    if (dbKey) dbUpdates[dbKey] = val;
  }

  if (Object.keys(dbUpdates).length > 0) {
    await db.from("profiles").update(dbUpdates).eq("user_id", userId);
  }
}

// ── Ideal Types ────────────────────────────────────────────────────

export async function getIdealType(userId: string) {
  const db = await getDb();
  const { data } = await db
    .from("ideal_types")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (!data) return null;
  return {
    userId: data.user_id,
    idealAge: data.ideal_age_range,
    idealMinHeight: data.min_height,
    idealMaxHeight: data.max_height,
    idealCities: data.cities || [],
    idealWorkplaces: data.workplaces || [],
    idealJobs: data.jobs || [],
    idealSalaries: data.salaries || [],
    idealEducation: data.education || [],
    idealSmoking: data.ideal_smoking,
    idealMbti: data.ideal_mbti || [],
    topPriorities: data.top_priorities || [],
  };
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
  await db.from("cart_items").upsert(
    { female_profile_id: femaleProfileId, male_profile_id: maleProfileId },
    { onConflict: "female_profile_id,male_profile_id" },
  );
}

export async function removeCartItem(femaleProfileId: string, maleProfileId: string) {
  const db = await getDb();
  await db.from("cart_items")
    .delete()
    .eq("female_profile_id", femaleProfileId)
    .eq("male_profile_id", maleProfileId);
}

// ── Rejection Logs (쿨타임) ────────────────────────────────────────

export async function getCooldownMaleIds(femaleProfileId: string) {
  const db = await getDb();
  const { data } = await db
    .from("rejection_logs")
    .select("male_profile_id")
    .eq("female_profile_id", femaleProfileId)
    .gt("visible_after", new Date().toISOString());
  return (data || []).map(d => d.male_profile_id);
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
function mapUserWithProfile(row: any) {
  const p = row.profiles?.[0] || row.profiles || {};
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
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
  };
}
