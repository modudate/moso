"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { User, MatchRequest } from "@/lib/types";
import { regionLabel, EDUCATIONS, JOB_TYPES, SALARIES, SMOKING, MBTI_TYPES, PRIORITIES, BIRTH_YEARS, CITIES, DISTRICTS } from "@/lib/options";

const ADMIN_PW = "ourmo2026";

const HEIGHTS_OPTS = ["151 ~ 155","156 ~ 160","161 ~ 165","166 ~ 170","171 ~ 175","176 ~ 180","181 ~ 185","185 이상"];
const AGE_RANGES = ["2006년 ~ 1997년","1996년 ~ 1994년","1993년 ~ 1990년","1989년 ~ 1987년","1986년 ~ 1984년","1983년 ~ 1981년"];

interface FieldDef {
  key: keyof User;
  label: string;
  type: "text" | "select" | "city-district";
  options?: string[];
  cityKey?: keyof User;
  districtKey?: keyof User;
}

const PROFILE_FIELDS: FieldDef[] = [
  { key: "name", label: "이름", type: "text" },
  { key: "gender", label: "성별", type: "select", options: ["남자", "여자"] },
  { key: "birthYear", label: "출생년도", type: "select", options: BIRTH_YEARS },
  { key: "city", label: "거주지", type: "city-district", cityKey: "city", districtKey: "district" },
  { key: "education", label: "학력", type: "select", options: EDUCATIONS },
  { key: "height", label: "키(cm)", type: "text" },
  { key: "job", label: "직무", type: "text" },
  { key: "jobType", label: "직업형태", type: "select", options: JOB_TYPES },
  { key: "salary", label: "연봉", type: "select", options: SALARIES },
  { key: "smoking", label: "흡연", type: "select", options: SMOKING },
  { key: "mbti", label: "MBTI", type: "select", options: MBTI_TYPES },
  { key: "charm", label: "매력포인트", type: "text" },
  { key: "datingStyle", label: "연애스타일", type: "text" },
  { key: "phone", label: "연락처", type: "text" },
];

const IDEAL_FIELDS: FieldDef[] = [
  { key: "idealHeight", label: "이상형 키", type: "select", options: HEIGHTS_OPTS },
  { key: "idealAge", label: "이상형 나이", type: "select", options: AGE_RANGES },
  { key: "idealCity", label: "이상형 거주지", type: "city-district", cityKey: "idealCity", districtKey: "idealDistrict" },
  { key: "idealSmoking", label: "이상형 흡연", type: "select", options: SMOKING },
  { key: "idealEducation", label: "이상형 학력", type: "select", options: EDUCATIONS },
  { key: "idealJobType", label: "이상형 직업형태", type: "select", options: JOB_TYPES },
  { key: "idealSalary", label: "이상형 연봉", type: "select", options: SALARIES },
  { key: "priority", label: "우선순위", type: "select", options: PRIORITIES },
];

export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<(MatchRequest & { otherUser?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    const res = await fetch("/api/profiles");
    const allUsers: User[] = await res.json();
    const found = allUsers.find(u => u.id === id);
    if (!found) { router.push("/admin"); return; }
    setUser(found);

    const mRes = found.gender === "남자"
      ? await fetch(`/api/match?toUserId=${id}`)
      : await fetch(`/api/match?fromUserId=${id}`);
    const matchData: MatchRequest[] = await mRes.json();
    const enriched = matchData.map(m => {
      const otherId = found.gender === "남자" ? m.fromUserId : m.toUserId;
      return { ...m, otherUser: allUsers.find(u => u.id === otherId) };
    });
    setMatches(enriched);
    setLoading(false);
  };

  const updateField = async (key: string, value: string) => {
    if (!user) return;
    await fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, [key]: value }) });
    setUser(prev => prev ? { ...prev, [key]: value } : null);
  };

  const updateExpires = async (date: string) => {
    if (!user) return;
    const val = new Date(date).toISOString();
    await fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, expiresAt: val }) });
    setUser(prev => prev ? { ...prev, expiresAt: val } : null);
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const expired = user.expiresAt && new Date(user.expiresAt) < new Date();

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="text-muted-fg hover:text-foreground">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold flex-1">{user.name} 상세</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Profile Image & Status */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:ring-4 ring-primary/20 transition-all" onClick={() => setImageModal(true)}>
            {user.imageUrl ? <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" /> :
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary/20">{user.name?.[0]}</div>}
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${user.status === "approved" ? "bg-success/10 text-success" : user.status === "pending" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>
                {user.status === "approved" ? "승인됨" : user.status === "pending" ? "승인대기" : "반려됨"}
              </span>
              {user.blocked && <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-muted text-muted-fg">차단됨</span>}
            </div>
            <p className="text-sm text-muted-fg">가입일: {new Date(user.createdAt).toLocaleDateString("ko-KR")}</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-fg">만료일:</span>
              <input type="date"
                value={user.expiresAt ? new Date(user.expiresAt).toISOString().split("T")[0] : ""}
                onChange={(e) => updateExpires(e.target.value)}
                className={`text-sm px-3 py-1.5 rounded-lg border ${expired ? "border-danger text-danger" : "border-border"} bg-white focus:outline-none focus:ring-2 focus:ring-primary/30`} />
              {expired && <span className="text-xs text-danger font-semibold">만료됨</span>}
            </div>
          </div>
        </div>

        {/* Profile Fields */}
        <FieldSection title="기본 정보" fields={PROFILE_FIELDS} user={user} onUpdate={updateField} />
        <FieldSection title="이상형 정보" fields={IDEAL_FIELDS} user={user} onUpdate={updateField} />

        {/* Match Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">매칭 현황 ({matches.length})</h3>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-fg bg-muted rounded-xl p-4">매칭 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {matches.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {m.otherUser?.imageUrl ? <img src={m.otherUser.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/10" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.otherUser?.name || "알수없음"}</p>
                    <p className="text-xs text-muted-fg">{user.gender === "남자" ? "← 선택받음" : "→ 선택함"} · {new Date(m.createdAt).toLocaleDateString("ko-KR")}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.action === "accepted" ? "bg-success/10 text-success" : m.action === "rejected" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                    {m.action === "accepted" ? "수락" : m.action === "rejected" ? "거절" : "대기"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full image modal */}
      {imageModal && user.imageUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setImageModal(false)}>
          <img src={user.imageUrl} alt={user.name} className="max-w-full max-h-[90vh] rounded-2xl object-contain" />
        </div>
      )}
    </main>
  );
}

function FieldSection({ title, fields, user, onUpdate }: { title: string; fields: FieldDef[]; user: User; onUpdate: (key: string, val: string) => void }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        {fields.map(f => (
          <EditableRow key={f.key} field={f} user={user} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

function EditableRow({ field, user, onUpdate }: { field: FieldDef; user: User; onUpdate: (key: string, val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(user[field.key] || ""));

  const save = () => { onUpdate(field.key, val); setEditing(false); };
  const cancel = () => { setVal(String(user[field.key] || "")); setEditing(false); };

  if (field.type === "city-district" && field.cityKey && field.districtKey) {
    const city = String(user[field.cityKey] || "");
    const district = String(user[field.districtKey] || "");
    return (
      <div className="flex items-center px-4 py-3 gap-4">
        <span className="text-sm text-muted-fg w-28 flex-shrink-0">{field.label}</span>
        <div className="flex-1 flex gap-2">
          <select value={city} onChange={(e) => { onUpdate(String(field.cityKey), e.target.value); onUpdate(String(field.districtKey), ""); }}
            className="text-sm px-3 py-1.5 bg-muted/40 border-0 rounded-lg cursor-pointer focus:ring-2 focus:ring-primary/20 focus:outline-none">
            <option value="">선택</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {DISTRICTS[city]?.length > 0 && (
            <select value={district} onChange={(e) => onUpdate(String(field.districtKey), e.target.value)}
              className="text-sm px-3 py-1.5 bg-muted/40 border-0 rounded-lg cursor-pointer focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="">선택</option>
              {DISTRICTS[city].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div className="flex items-center px-4 py-3 gap-4">
        <span className="text-sm text-muted-fg w-28 flex-shrink-0">{field.label}</span>
        <select value={String(user[field.key] || "")} onChange={(e) => onUpdate(field.key, e.target.value)}
          className="flex-1 text-sm px-3 py-1.5 bg-muted/40 border-0 rounded-lg cursor-pointer focus:ring-2 focus:ring-primary/20 focus:outline-none">
          <option value="">선택</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center px-4 py-3 gap-4" onDoubleClick={() => setEditing(true)}>
      <span className="text-sm text-muted-fg w-28 flex-shrink-0">{field.label}</span>
      {editing ? (
        <div className="flex-1 flex gap-2">
          <input type="text" value={val} onChange={(e) => setVal(e.target.value)} autoFocus
            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-primary/30 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            onBlur={save} />
        </div>
      ) : (
        <span className="flex-1 text-sm text-foreground cursor-pointer hover:text-primary transition-colors">{String(user[field.key] || "-")}</span>
      )}
    </div>
  );
}
