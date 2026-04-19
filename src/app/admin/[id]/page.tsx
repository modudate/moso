"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { User, IdealType, AdminNote, MdRecommendation, MatchRequest } from "@/lib/types";
import { regionLabel, smokingLabel, EDUCATIONS, WORKPLACES, JOBS, WORK_PATTERNS, SALARIES, SMOKING_OPTIONS, MBTI_TYPES, BIRTH_YEARS, CITIES, DISTRICTS } from "@/lib/options";
import MultiImageUploader from "@/components/MultiImageUploader";
import ImageUploader from "@/components/ImageUploader";

const MD_PER_PAGE = 6;

export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [idealType, setIdealType] = useState<IdealType | null>(null);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [mdRecs, setMdRecs] = useState<MdRecommendation[]>([]);
  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newNote, setNewNote] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [mdTarget, setMdTarget] = useState("");
  const [showMdForm, setShowMdForm] = useState(false);
  const [mdSearch, setMdSearch] = useState("");
  const [mdPage, setMdPage] = useState(1);
  useEffect(() => { fetchData(); }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    const [detailRes, matchRes, usersRes] = await Promise.all([
      fetch(`/api/profiles?id=${userId}`),
      fetch(`/api/match?all=true`),
      fetch("/api/profiles"),
    ]);
    const detail = await detailRes.json();
    const allMatches: MatchRequest[] = await matchRes.json();
    const users: User[] = await usersRes.json();

    setUser(detail.user);
    setIdealType(detail.idealType || null);
    setNotes(detail.notes || []);
    setMdRecs(detail.mdRecs || []);
    setAllUsers(users);
    const userMatches = allMatches.filter(m => m.femaleProfileId === userId || m.maleProfileId === userId);
    setMatches(userMatches);
    setLoading(false);
  };

  const saveField = (key: string, value: unknown) => {
    setUser(prev => prev ? { ...prev, [key]: value } : prev);
    setEditing(null);
    fetch("/api/profiles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, [key]: value }) });
  };

  const handleDoubleClick = (key: string, currentValue: string) => { setEditing(key); setEditValue(String(currentValue)); };
  const handleKeyDown = (e: React.KeyboardEvent, key: string) => { if (e.key === "Enter") saveField(key, editValue); if (e.key === "Escape") setEditing(null); };

  const sendMdRecommendation = async () => {
    if (!mdTarget) return;
    const res = await fetch("/api/md-recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maleProfileId: userId, femaleProfileId: mdTarget }),
    });
    const data = await res.json();
    if (res.ok && data.md) {
      setMdRecs(prev => [...prev, data.md]);
    }
    setMdTarget("");
    setShowMdForm(false);
    setMdSearch("");
    setMdPage(1);
  };

  const alreadyRecommended = useMemo(() => new Set(mdRecs.map(md => md.femaleProfileId)), [mdRecs]);

  const mdCandidates = useMemo(() => {
    let list = allUsers.filter(u => u.role === "female" && u.status === "active" && !alreadyRecommended.has(u.id));
    if (mdSearch.length >= 1) {
      list = list.filter(u => u.realName.includes(mdSearch) || u.nickname.includes(mdSearch) || u.phone.includes(mdSearch));
    }
    return list;
  }, [allUsers, alreadyRecommended, mdSearch]);

  const mdTotalPages = Math.ceil(mdCandidates.length / MD_PER_PAGE);
  const mdPaged = mdCandidates.slice((mdPage - 1) * MD_PER_PAGE, mdPage * MD_PER_PAGE);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const getUser = (id: string) => allUsers.find(u => u.id === id);
  const getUserName = (id: string) => { const u = getUser(id); return u ? `${u.realName} (${u.nickname})` : id; };

  return (
    <main className="min-h-screen bg-background">
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white z-10" onClick={() => setLightbox(null)}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={lightbox} alt="원본" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold flex-1 text-white">{user.realName} ({user.nickname})</h1>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.status === "active" ? "bg-white/20 text-white" : user.status === "pending" ? "bg-yellow-300/30 text-white" : user.status === "blocked" ? "bg-red-600/30 text-white" : "bg-white/10 text-white/70"}`}>
            {user.status}
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 사진 관리 */}
        <section className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="font-bold text-lg">사진 관리</h2>

          <MultiImageUploader
            key={`multi-${userId}`}
            values={user.photoUrls}
            maxCount={4}
            category="photo"
            onChanged={(_paths, urls) => saveField("photoUrls", urls)}
            label="대표 사진 (최대 4장)"
          />

          <div className="grid grid-cols-2 gap-4">
            <ImageUploader
              key={`charm-${userId}-${user.charmPhoto || "empty"}`}
              value={user.charmPhoto}
              category="charm"
              onUploaded={(_path, url) => saveField("charmPhoto", url)}
              onRemove={() => saveField("charmPhoto", null)}
              label="저의 매력은 사진"
            />
            <ImageUploader
              key={`date-${userId}-${user.datePhoto || "empty"}`}
              value={user.datePhoto}
              category="date"
              onUploaded={(_path, url) => saveField("datePhoto", url)}
              onRemove={() => saveField("datePhoto", null)}
              label="연인이 생기면 사진"
            />
          </div>
        </section>

        {/* 프로필 정보 */}
        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-lg mb-4">프로필 정보</h2>
          <div className="grid grid-cols-2 gap-5 text-base">
            <EditableField label="본명" value={user.realName} fieldKey="realName" editing={editing} editValue={editValue} onDoubleClick={handleDoubleClick} onSave={saveField} onChange={setEditValue} onKeyDown={handleKeyDown} onCancel={() => setEditing(null)} />
            <EditableField label="닉네임" value={user.nickname} fieldKey="nickname" editing={editing} editValue={editValue} onDoubleClick={handleDoubleClick} onSave={saveField} onChange={setEditValue} onKeyDown={handleKeyDown} onCancel={() => setEditing(null)} />
            <SelectField label="출생년도" value={String(user.birthYear) + "년"} options={BIRTH_YEARS} onSelect={(v) => saveField("birthYear", parseInt(v))} />
            <EditableField label="키" value={String(user.height)} fieldKey="height" editing={editing} editValue={editValue} onDoubleClick={handleDoubleClick} onSave={(k, v) => saveField(k, parseInt(v as string))} onChange={setEditValue} onKeyDown={handleKeyDown} onCancel={() => setEditing(null)} suffix="cm" />
            <SelectField label="거주지 (시/도)" value={user.city} options={CITIES} onSelect={(v) => saveField("city", v)} />
            <SelectField label="거주지 (구역)" value={user.district} options={DISTRICTS[user.city] || []} onSelect={(v) => saveField("district", v)} />
            <SelectField label="직장" value={user.workplace} options={WORKPLACES} onSelect={(v) => { saveField("workplace", v); const jobs = JOBS[v]; if (jobs && !jobs.includes(user.job)) saveField("job", jobs[0]); }} />
            <SelectField label="직업" value={user.job} options={JOBS[user.workplace] || ["기타"]} onSelect={(v) => saveField("job", v)} />
            <SelectField label="근무패턴" value={user.workPattern} options={WORK_PATTERNS} onSelect={(v) => saveField("workPattern", v)} />
            <SelectField label="연봉" value={user.salary} options={SALARIES} onSelect={(v) => saveField("salary", v)} />
            <SelectField label="학력" value={user.education} options={EDUCATIONS} onSelect={(v) => saveField("education", v)} />
            <SelectField label="흡연" value={smokingLabel(user.smoking)} options={["유", "무"]} onSelect={(v) => saveField("smoking", v === "유")} />
            <SelectField label="MBTI" value={user.mbti} options={MBTI_TYPES} onSelect={(v) => saveField("mbti", v)} />
            <EditableField label="저의 매력은" value={user.charm} fieldKey="charm" editing={editing} editValue={editValue} onDoubleClick={handleDoubleClick} onSave={saveField} onChange={setEditValue} onKeyDown={handleKeyDown} onCancel={() => setEditing(null)} maxLength={200} />
            <EditableField label="연인이 생기면 하고 싶은 일은" value={user.datingStyle} fieldKey="datingStyle" editing={editing} editValue={editValue} onDoubleClick={handleDoubleClick} onSave={saveField} onChange={setEditValue} onKeyDown={handleKeyDown} onCancel={() => setEditing(null)} maxLength={200} />
            <EditableField label="전화번호" value={user.phone} fieldKey="phone" editing={editing} editValue={editValue} onDoubleClick={handleDoubleClick} onSave={saveField} onChange={setEditValue} onKeyDown={handleKeyDown} onCancel={() => setEditing(null)} />
          </div>
        </section>

        {/* 이상형 정보 */}
        {idealType && (
          <section className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-bold text-lg mb-4">이상형 정보</h2>
            <div className="grid grid-cols-2 gap-5 text-base">
              <InfoDisplay label="선호 나이" value={idealType.idealAge} />
              <InfoDisplay label="선호 키" value={`${idealType.idealMinHeight}cm ~ ${idealType.idealMaxHeight}cm`} />
              <InfoDisplay label="선호 거주지" value={idealType.idealCities.join(", ") || "-"} />
              <InfoDisplay label="선호 직장" value={idealType.idealWorkplaces.join(", ") || "-"} />
              <InfoDisplay label="선호 연봉" value={idealType.idealSalaries.join(", ") || "-"} />
              <InfoDisplay label="선호 학력" value={idealType.idealEducation.join(", ") || "-"} />
              <InfoDisplay label="선호 흡연" value={idealType.idealSmoking === null ? "상관없음" : idealType.idealSmoking ? "흡연" : "비흡연"} />
              <InfoDisplay label="선호 MBTI" value={idealType.idealMbti.join(", ") || "상관없음"} />
              <div className="col-span-2">
                <span className="text-muted-fg text-sm">최애 포인트 (우선순위)</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {idealType.topPriorities.map((p, i) => (
                    <span key={p} className="px-4 py-1.5 rounded-full text-sm font-semibold" style={{ backgroundColor: i === 0 ? "#ff8a3d" : i === 1 ? "#ffb380" : i === 2 ? "#ffd9c2" : "#f3f0ed", color: i < 2 ? "white" : i === 2 ? "#ff8a3d" : "#8a8480" }}>
                      {i + 1}. {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 매칭 내역 */}
        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-lg mb-4">매칭 내역 ({matches.length}건)</h2>
          {matches.length === 0 ? (
            <p className="text-base text-muted-fg">매칭 내역이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {matches.map(m => {
                const otherId = m.femaleProfileId === userId ? m.maleProfileId : m.femaleProfileId;
                const other = getUser(otherId);
                return (
                  <div key={m.id} className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl">
                    {other?.photoUrls[0] ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => setLightbox(other.photoUrls[0])}>
                        <img src={other.photoUrls[0]} alt={other.nickname} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center text-base font-bold text-primary/30">{other?.nickname?.[0] || "?"}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold truncate">{other ? `${other.realName} (${other.nickname})` : otherId}</p>
                      <p className="text-sm text-muted-fg">{other?.role === "male" ? "남성" : "여성"} · {other?.birthYear}년생 · {other ? regionLabel(other.city, other.district) : ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.status === "approved" ? "bg-success/10 text-success" : m.status === "pending" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>
                        {m.status === "approved" ? "수락" : m.status === "pending" ? "대기중" : "거절"}
                      </span>
                      <span className="text-xs text-muted-fg">{new Date(m.requestedAt).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MD 추천 (남성만) */}
        {user.role === "male" && (
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">MD 추천 ({mdRecs.length}건)</h2>
              <button onClick={() => { setShowMdForm(!showMdForm); setMdSearch(""); setMdPage(1); setMdTarget(""); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
                style={{ backgroundColor: "#7c5cfc" }}>
                {showMdForm ? "닫기" : "+ 여성 추천하기"}
              </button>
            </div>

            {showMdForm && (
              <div className="mb-4 p-5 bg-accent/5 rounded-xl border border-accent/20 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-accent flex-1">추천할 여성 회원 선택</p>
                  <span className="text-sm text-muted-fg">{mdCandidates.length}명</span>
                </div>
                <input type="text" value={mdSearch} onChange={(e) => { setMdSearch(e.target.value); setMdPage(1); }} placeholder="이름 / 닉네임 / 전화번호 검색"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-accent/30" />

                <div className="space-y-2">
                  {mdPaged.map(f => (
                    <label key={f.id} className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${mdTarget === f.id ? "bg-accent/10 border-accent/40 ring-1 ring-accent/20" : "border-transparent hover:bg-muted/40"}`}>
                      <input type="radio" name="mdTarget" value={f.id} checked={mdTarget === f.id} onChange={() => setMdTarget(f.id)} className="accent-[#7c5cfc] flex-shrink-0 w-4 h-4" />
                      {f.photoUrls[0] ? (
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img src={f.photoUrls[0]} alt={f.nickname} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center text-base font-bold text-primary/30">{f.nickname?.[0]}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold">{f.realName} ({f.nickname})</p>
                        <p className="text-sm text-muted-fg">{f.birthYear}년생 · {f.height}cm · {regionLabel(f.city, f.district)}</p>
                        <p className="text-sm text-muted-fg">{f.workplace} · {f.mbti}</p>
                      </div>
                    </label>
                  ))}
                  {mdPaged.length === 0 && <p className="text-base text-muted-fg py-4 text-center">추천 가능한 여성 회원이 없습니다</p>}
                </div>

                {mdTotalPages > 1 && (
                  <div className="flex justify-center gap-1.5 pt-2">
                    {Array.from({ length: mdTotalPages }, (_, i) => (
                      <button key={i} onClick={() => setMdPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${mdPage === i + 1 ? "text-white" : "bg-white border border-border text-muted-fg hover:border-accent/30"}`}
                        style={mdPage === i + 1 ? { backgroundColor: "#7c5cfc" } : {}}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={sendMdRecommendation} disabled={!mdTarget}
                    className="px-5 py-2.5 text-base font-semibold text-white rounded-xl disabled:opacity-40 transition-colors"
                    style={{ backgroundColor: "#7c5cfc" }}>
                    추천 보내기
                  </button>
                  <button onClick={() => { setShowMdForm(false); setMdTarget(""); setMdSearch(""); }}
                    className="px-5 py-2.5 text-base font-semibold text-muted-fg bg-muted rounded-xl hover:bg-muted/70 transition-colors">
                    취소
                  </button>
                </div>
              </div>
            )}

            {mdRecs.length === 0 && !showMdForm ? (
              <p className="text-base text-muted-fg">MD 추천 이력이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {mdRecs.map(md => {
                  const female = getUser(md.femaleProfileId);
                  return (
                    <div key={md.id} className="flex items-center gap-4 p-4 bg-accent/5 rounded-xl">
                      {female?.photoUrls[0] ? (
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-accent transition-all" onClick={() => setLightbox(female.photoUrls[0])}>
                          <img src={female.photoUrls[0]} alt={female.nickname} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center text-base font-bold text-accent/30">{female?.nickname?.[0] || "?"}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: "#7c5cfc" }}>MD</span>
                          <p className="text-base font-semibold truncate">{female ? `${female.realName} (${female.nickname})` : md.femaleProfileId}</p>
                        </div>
                        <p className="text-sm text-muted-fg mt-0.5">{female?.birthYear}년생 · {female ? regionLabel(female.city, female.district) : ""}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${md.status === "approved" ? "bg-success/10 text-success" : md.status === "pending" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>
                          {md.status === "approved" ? "수락" : md.status === "pending" ? "대기중" : "거절"}
                        </span>
                        <span className="text-xs text-muted-fg">{new Date(md.createdAt).toLocaleDateString("ko-KR")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 관리자 메모 */}
        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-lg mb-4">관리자 메모</h2>
          <div className="space-y-3 mb-4">
            {notes.map(n => (
              <div key={n.id} className="p-4 bg-muted/40 rounded-xl">
                <p className="text-base">{n.content}</p>
                <p className="text-xs text-muted-fg mt-1">{new Date(n.createdAt).toLocaleString("ko-KR")}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="메모 작성..."
              onKeyDown={async (e) => { if (e.key === "Enter" && newNote.trim()) { const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, content: newNote }) }); const data = await res.json(); if (data.note) setNotes(prev => [data.note, ...prev]); setNewNote(""); } }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={async () => { if (newNote.trim()) { const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, content: newNote }) }); const data = await res.json(); if (data.note) setNotes(prev => [data.note, ...prev]); setNewNote(""); } }}
              className="px-5 py-2.5 bg-primary text-white text-base font-semibold rounded-xl hover:bg-primary-dark transition-colors">추가</button>
          </div>
        </section>

        {/* 만료일 */}
        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-lg mb-4">만료일 관리</h2>
          <input type="date" value={user.expiresAt ? new Date(user.expiresAt).toISOString().split("T")[0] : ""}
            onChange={(e) => saveField("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
            className="px-4 py-2.5 rounded-xl border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary/30" />
          {user.expiresAt && <p className="text-sm text-muted-fg mt-2">현재 만료일: {new Date(user.expiresAt).toLocaleDateString("ko-KR")}</p>}
        </section>

        {/* 상태 관리 */}
        <section className="flex gap-3 pb-6">
          {user.status === "pending" && (
            <>
              <button onClick={() => saveField("status", "active")} className="flex-1 py-3 bg-success text-white rounded-xl font-semibold">승인</button>
              <button onClick={() => saveField("status", "rejected")} className="flex-1 py-3 bg-danger text-white rounded-xl font-semibold">반려</button>
            </>
          )}
          {user.status === "active" && (
            <button onClick={() => saveField("status", "blocked")} className="flex-1 py-3 bg-muted text-muted-fg rounded-xl font-semibold hover:bg-danger/10 hover:text-danger transition-colors">차단</button>
          )}
          {user.status === "blocked" && (
            <button onClick={() => saveField("status", "active")} className="flex-1 py-3 bg-muted text-muted-fg rounded-xl font-semibold hover:bg-success/10 hover:text-success transition-colors">해제</button>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-fg text-sm">{label}</span>
      <p className="font-medium text-base">{value}</p>
    </div>
  );
}

function EditableField({ label, value, fieldKey, editing, editValue, suffix, maxLength, onDoubleClick, onSave, onChange, onKeyDown, onCancel }: {
  label: string; value: string; fieldKey: string; editing: string | null; editValue: string; suffix?: string; maxLength?: number;
  onDoubleClick: (key: string, val: string) => void; onSave: (key: string, val: unknown) => void; onChange: (v: string) => void; onKeyDown: (e: React.KeyboardEvent, key: string) => void; onCancel: () => void;
}) {
  if (editing === fieldKey) {
    return (
      <div>
        <span className="text-muted-fg text-sm">{label}</span>
        {maxLength ? (
          <div>
            <textarea autoFocus value={editValue} onChange={(e) => { if (e.target.value.length <= maxLength) onChange(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
              onBlur={onCancel} rows={3} maxLength={maxLength}
              className="w-full px-3 py-2 border border-primary rounded-lg text-base focus:outline-none resize-none" />
            <span className="text-xs text-muted-fg">{editValue.length}/{maxLength}자</span>
          </div>
        ) : (
          <input autoFocus value={editValue} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => onKeyDown(e, fieldKey)} onBlur={onCancel}
            className="w-full px-3 py-2 border border-primary rounded-lg text-base focus:outline-none" />
        )}
      </div>
    );
  }
  return (
    <div onDoubleClick={() => onDoubleClick(fieldKey, value)} className="cursor-pointer hover:bg-muted/30 rounded-lg px-1 -mx-1 transition-colors">
      <span className="text-muted-fg text-sm">{label}</span>
      <p className="font-medium text-base">{value}{suffix}</p>
    </div>
  );
}

function SelectField({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (v: string) => void }) {
  return (
    <div>
      <span className="text-muted-fg text-sm">{label}</span>
      <select value={value} onChange={(e) => onSelect(e.target.value)}
        className="w-full text-base font-medium bg-transparent border-b border-transparent hover:border-border cursor-pointer focus:outline-none">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
