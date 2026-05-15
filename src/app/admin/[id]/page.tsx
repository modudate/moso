"use client";

import { useState, useEffect, use, useMemo, useRef } from "react";
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [mdTarget, setMdTarget] = useState("");
  const [showMdForm, setShowMdForm] = useState(false);
  const [mdSearch, setMdSearch] = useState("");
  const [mdPage, setMdPage] = useState(1);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  useEffect(() => { fetchData(); }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    // cache: "no-store" 로 항상 신선한 데이터 가져오기 (방금 저장한 사진이 즉시 반영되도록)
    const [detailRes, matchRes, usersRes] = await Promise.all([
      fetch(`/api/profiles?id=${userId}`, { cache: "no-store" }),
      fetch(`/api/match?all=true`, { cache: "no-store" }),
      fetch("/api/profiles", { cache: "no-store" }),
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

  // 필드별 PATCH 큐: 같은 필드의 빠른 연속 호출은 마지막 값만 보내고, 항상 직전 요청 종료 후 다음을 보냄.
  // (특히 사진 일괄 업로드 시 photoUrls 가 race condition 으로 유실되던 문제를 막음)
  const fieldQueue = useRef<Map<string, { latest: unknown; running: boolean }>>(new Map());
  const inflight = useRef(0);
  const [savingField, setSavingField] = useState<Set<string>>(new Set());

  const flushField = async (key: string) => {
    const q = fieldQueue.current.get(key);
    if (!q || q.running) return;
    q.running = true;
    inflight.current += 1;
    setSavingField(prev => new Set(prev).add(key));
    try {
      while (fieldQueue.current.has(key)) {
        const entry = fieldQueue.current.get(key)!;
        const value = entry.latest;
        fieldQueue.current.delete(key);
        const res = await fetch("/api/profiles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId, [key]: value }),
          // 페이지 이탈/탭 닫기 후에도 요청이 완료되도록 보장 (브라우저가 background로 마무리)
          keepalive: true,
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          alert(`저장 실패 (${key}): ${msg || res.status}`);
          break;
        }
        // 서버가 돌려준 최신 user 로 동기화 → DB 가 실제로 받은 값을 화면에 반영
        try {
          const data = await res.json();
          if (data?.user) {
            setUser(prev => {
              // 큐가 아직 차 있으면 (사용자가 후속 변경을 했음) 덮어쓰지 않음
              if (fieldQueue.current.has(key)) return prev;
              return data.user;
            });
          }
        } catch { /* ignore JSON parse errors */ }
      }
    } catch (err) {
      alert(`저장 중 오류 (${key}): ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      const q2 = fieldQueue.current.get(key);
      if (q2) q2.running = false;
      inflight.current -= 1;
      setSavingField(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const saveField = (key: string, value: unknown) => {
    // [DEBUG] photo_urls 유실 추적
    console.log("[admin saveField] 호출", { key, value });
    if (key === "photoUrls" && Array.isArray(value) && value.length === 0) {
      console.warn("[admin saveField] ⚠️ photoUrls 빈 배열로 저장 시도");
      console.trace("[admin saveField] photoUrls=[] stack");
    }
    setUser(prev => prev ? { ...prev, [key]: value } : prev);
    setEditing(null);
    const existing = fieldQueue.current.get(key);
    if (existing) existing.latest = value;
    else fieldQueue.current.set(key, { latest: value, running: false });
    void flushField(key);
  };

  // 페이지 이탈 시 미저장 작업 경고
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (inflight.current > 0 || fieldQueue.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleDoubleClick = (key: string, currentValue: string) => { setEditing(key); setEditValue(String(currentValue)); };
  const handleKeyDown = (e: React.KeyboardEvent, key: string) => { if (e.key === "Enter") saveField(key, editValue); if (e.key === "Escape") setEditing(null); };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, content: newNote }),
    });
    const data = await res.json();
    if (data.note) setNotes(prev => [data.note, ...prev]);
    setNewNote("");
  };

  const startEditNote = (id: string, content: string) => {
    setEditingNoteId(id);
    setEditingNoteValue(content);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteValue("");
  };

  const saveEditNote = async () => {
    if (!editingNoteId || !editingNoteValue.trim()) return;
    const res = await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingNoteId, content: editingNoteValue }),
    });
    const data = await res.json();
    if (data.note) {
      setNotes(prev => prev.map(n => (n.id === data.note.id ? data.note : n)));
    }
    cancelEditNote();
  };

  const deleteNote = async (id: string) => {
    if (!confirm("이 메모를 삭제할까요?")) return;
    const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

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
    } else if (data?.locked) {
      alert(data.error || "이미 매칭/추천 이력이 있는 여성입니다.");
      // 다시 fetch 해서 후보 목록을 최신 상태로 동기화
      fetchData();
    } else if (!res.ok) {
      alert(data?.error || "추천 전송에 실패했습니다.");
    }
    setMdTarget("");
    setShowMdForm(false);
    setMdSearch("");
    setMdPage(1);
  };

  const cancelMdRecommendation = async (mdId: string) => {
    if (!confirm("이 MD 추천을 취소하시겠습니까?")) return;
    const prev = mdRecs;
    setMdRecs(p => p.filter(m => m.id !== mdId));
    const res = await fetch(`/api/md-recommendation?id=${mdId}`, { method: "DELETE" });
    if (!res.ok) {
      setMdRecs(prev);
      alert("취소에 실패했습니다");
    }
  };

  const alreadyRecommended = useMemo(() => new Set(mdRecs.map(md => md.femaleProfileId)), [mdRecs]);

  // 영구 잠금 — 이 남성과 매칭 이력(pending/approved/rejected)이 있는 여성도 추천 후보에서 제외
  const alreadyMatched = useMemo(() => {
    const set = new Set<string>();
    if (user?.role !== "male") return set;
    for (const m of matches) {
      if (m.maleProfileId === userId) set.add(m.femaleProfileId);
    }
    return set;
  }, [matches, user?.role, userId]);

  const mdCandidates = useMemo(() => {
    let list = allUsers.filter(
      (u) =>
        u.role === "female" &&
        u.status === "active" &&
        !alreadyRecommended.has(u.id) &&
        !alreadyMatched.has(u.id),
    );
    if (mdSearch.length >= 1) {
      const q = mdSearch.trim();
      // 전화번호 검색은 하이픈/공백 제거 후 비교 (사용자가 0101234... 처럼 하이픈 없이 입력해도 매칭)
      const qDigits = q.replace(/[^0-9]/g, "");
      list = list.filter((u) => {
        if (u.realName.includes(q)) return true;
        if (u.nickname.includes(q)) return true;
        // 1) 입력에 하이픈이 포함되어 있다면 그대로도 매치 시도
        if (q && u.phone.includes(q)) return true;
        // 2) 양쪽 다 숫자만 추출해서 비교
        if (qDigits.length >= 2) {
          const phoneDigits = u.phone.replace(/[^0-9]/g, "");
          if (phoneDigits.includes(qDigits)) return true;
        }
        return false;
      });
    }
    return list;
  }, [allUsers, alreadyRecommended, alreadyMatched, mdSearch]);

  const mdTotalPages = Math.ceil(mdCandidates.length / MD_PER_PAGE);
  const mdPaged = mdCandidates.slice((mdPage - 1) * MD_PER_PAGE, mdPage * MD_PER_PAGE);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const getUser = (id: string) => allUsers.find(u => u.id === id);
  const getUserName = (id: string) => { const u = getUser(id); return u ? `${u.realName} (${u.nickname})` : id; };

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
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
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">사진 관리</h2>
            {(savingField.has("photoUrls") || savingField.has("charmPhoto") || savingField.has("datePhoto")) && (
              <span className="flex items-center gap-1.5 text-xs text-muted-fg">
                <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                저장 중...
              </span>
            )}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-900 leading-relaxed">
            ⚠️ 사진의 <b>X 버튼을 누르면 즉시 삭제·저장</b>됩니다. 삭제 전 확인 창이 나타나며, 한 번 삭제된 사진은 복구할 수 없으니 주의해주세요.
          </div>

          <MultiImageUploader
            key={`multi-${userId}`}
            values={user.photoUrls}
            maxCount={4}
            category="photo"
            confirmRemove
            onChanged={(_paths, urls) => saveField("photoUrls", urls)}
            label="대표 사진 (최대 4장)"
          />

          <div className="grid grid-cols-2 gap-4">
            <ImageUploader
              key={`charm-${userId}-${user.charmPhoto || "empty"}`}
              value={user.charmPhoto}
              category="charm"
              confirmRemove
              cropAspect={1}
              cropTitle="저의 매력 사진 영역 선택 (1:1)"
              onUploaded={(_path, url) => saveField("charmPhoto", url)}
              onRemove={() => saveField("charmPhoto", null)}
              label="저의 매력은 사진"
            />
            <ImageUploader
              key={`date-${userId}-${user.datePhoto || "empty"}`}
              value={user.datePhoto}
              category="date"
              confirmRemove
              cropAspect={1}
              cropTitle="연인이 생기면 사진 영역 선택 (1:1)"
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
            <SelectField label="거주지 (시/도)" value={user.city} options={CITIES} onSelect={(v) => { saveField("city", v); saveField("district", ""); }} />
            {(DISTRICTS[user.city] || []).length > 0 && (
              <SelectField label="거주지 (구/군/시)" value={user.district} options={DISTRICTS[user.city] || []} onSelect={(v) => saveField("district", v)} />
            )}
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
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${md.status === "approved" ? "bg-success/10 text-success" : md.status === "pending" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>
                          {md.status === "approved" ? "수락" : md.status === "pending" ? "대기중" : "거절"}
                        </span>
                        <span className="text-xs text-muted-fg">{new Date(md.createdAt).toLocaleDateString("ko-KR")}</span>
                        <button
                          onClick={() => cancelMdRecommendation(md.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
                        >
                          취소
                        </button>
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
            {notes.length === 0 && (
              <p className="text-sm text-muted-fg">등록된 메모가 없습니다.</p>
            )}
            {notes.map(n => {
              const isEditing = editingNoteId === n.id;
              const updated = n.updatedAt && n.updatedAt !== n.createdAt;
              return (
                <div key={n.id} className="p-4 bg-muted/40 rounded-xl">
                  {isEditing ? (
                    <div className="space-y-2 min-w-0">
                      <textarea
                        value={editingNoteValue}
                        onChange={(e) => setEditingNoteValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEditNote();
                          if (e.key === "Escape") cancelEditNote();
                        }}
                        autoFocus
                        rows={3}
                        cols={1}
                        className="block w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEditNote}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-border text-muted-fg hover:bg-muted transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={saveEditNote}
                          disabled={!editingNoteValue.trim()}
                          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-base whitespace-pre-wrap break-words">{n.content}</p>
                        <p className="text-xs text-muted-fg mt-1">
                          {new Date(n.createdAt).toLocaleString("ko-KR")}
                          {updated && (
                            <span className="ml-2 text-muted-fg/70">
                              (수정됨 · {new Date(n.updatedAt).toLocaleString("ko-KR")})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditNote(n.id, n.content)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-border text-muted-fg hover:text-foreground hover:border-primary/30 transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteNote(n.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-border text-muted-fg hover:text-danger hover:border-danger/30 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 min-w-0">
            <input
              type="text"
              size={1}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="메모 작성..."
              onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim()}
              className="flex-shrink-0 px-5 py-2.5 bg-primary text-white text-base font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              추가
            </button>
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

        {/* 반려 사유 (반려 상태일 때만) */}
        {user.status === "rejected" && user.rejectionReason && (
          <section className="bg-danger/5 border border-danger/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base text-danger">반려 사유</h3>
              <button
                onClick={() => {
                  setRejectReason(user.rejectionReason ?? "");
                  setShowRejectModal(true);
                }}
                className="text-xs px-2.5 py-1 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
              >
                사유 수정
              </button>
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{user.rejectionReason}</p>
          </section>
        )}

        {/* 상태 관리 */}
        <section className="flex gap-3 pb-6">
          {user.status === "pending" && (
            <>
              <button onClick={() => saveField("status", "active")} className="flex-1 py-3 bg-success text-white rounded-xl font-semibold">승인</button>
              <button
                onClick={() => {
                  setRejectReason(user.rejectionReason ?? "");
                  setShowRejectModal(true);
                }}
                className="flex-1 py-3 bg-danger text-white rounded-xl font-semibold"
              >
                반려
              </button>
            </>
          )}
          {user.status === "active" && (
            <button onClick={() => saveField("status", "blocked")} className="flex-1 py-3 bg-muted text-muted-fg rounded-xl font-semibold hover:bg-danger/10 hover:text-danger transition-colors">차단</button>
          )}
          {user.status === "blocked" && (
            <button onClick={() => saveField("status", "active")} className="flex-1 py-3 bg-muted text-muted-fg rounded-xl font-semibold hover:bg-success/10 hover:text-success transition-colors">차단 해제 (활성화)</button>
          )}
          {user.status === "rejected" && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "이 회원의 반려를 취소하고 '승인 대기' 상태로 되돌리시겠습니까?\n\n다시 로그인하면 정상적으로 가입 절차를 진행할 수 있게 됩니다.",
                  )
                ) {
                  // 반려 취소 시 사유도 함께 비움
                  saveField("rejectionReason", null);
                  saveField("status", "pending");
                }
              }}
              className="flex-1 py-3 bg-warning/10 text-warning rounded-xl font-semibold border border-warning/30 hover:bg-warning/20 transition-colors"
            >
              반려 취소 (승인 대기로 되돌리기)
            </button>
          )}
        </section>
      </div>

      {showRejectModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowRejectModal(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col pointer-events-auto">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-danger">
                  {user.status === "rejected" ? "반려 사유 수정" : "회원 반려"}
                </h3>
                <button onClick={() => setShowRejectModal(false)} className="text-muted-fg hover:text-foreground" aria-label="닫기">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-muted-fg">
                  <b className="text-foreground">{user.realName} ({user.nickname})</b> 회원의 반려 사유를 입력해주세요.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">반려 사유 (필수)</label>
                  <textarea
                    autoFocus
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="예) 대표사진의 얼굴이 너무 작게 찍혀 있어 잘 보이지 않습니다. 다른 사진으로 교체 후 재신청 부탁드립니다."
                    rows={5}
                    maxLength={500}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-danger/30 resize-none"
                  />
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-fg">
                    <span>회원에게 안내되는 메시지입니다. 보완해야 할 부분을 구체적으로 작성해주세요.</span>
                    <span>{rejectReason.length}/500</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex gap-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white border border-border text-muted-fg font-semibold hover:bg-muted/40 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    const r = rejectReason.trim();
                    if (r.length < 5) {
                      alert("반려 사유를 5자 이상 입력해주세요.");
                      return;
                    }
                    saveField("rejectionReason", r);
                    if (user.status !== "rejected") {
                      saveField("status", "rejected");
                    }
                    setShowRejectModal(false);
                  }}
                  disabled={rejectReason.trim().length < 5}
                  className="flex-1 py-3 rounded-xl bg-danger text-white font-bold hover:bg-danger/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {user.status === "rejected" ? "사유 저장" : "반려하기"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
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
