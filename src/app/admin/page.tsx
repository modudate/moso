"use client";

import { useState, useEffect, useCallback } from "react";
import { Profile } from "@/lib/types";

const ADMIN_PASSWORD = "ourmo2026";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkMap, setLinkMap] = useState<Record<string, { token: string; expiresAt: string }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/profiles");
    const data = await res.json();
    setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) fetchProfiles();
  }, [authed, fetchProfiles]);

  const handleBlock = async (id: string) => {
    await fetch("/api/profiles/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchProfiles();
  };

  const handleCreateLink = async (profileId: string) => {
    const res = await fetch("/api/profiles/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    const data = await res.json();
    setLinkMap((prev) => ({ ...prev, [profileId]: data }));
  };

  const handleCopyLink = (profileId: string, token: string) => {
    const url = `${window.location.origin}/profile/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(profileId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white px-4">
        <div className="bg-card rounded-3xl shadow-xl p-10 max-w-sm w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">관리자 로그인</h1>
            <p className="text-muted-fg text-sm">비밀번호를 입력하세요</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full px-5 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              onKeyDown={(e) => e.key === "Enter" && password === ADMIN_PASSWORD && setAuthed(true)}
            />
            <div className="bg-muted rounded-lg px-4 py-2 text-center">
              <span className="text-xs text-muted-fg">데모 비밀번호: </span>
              <span className="text-sm font-mono font-semibold text-primary">{ADMIN_PASSWORD}</span>
            </div>
          </div>
          <button
            onClick={() => password === ADMIN_PASSWORD && setAuthed(true)}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            로그인
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            OUR<span className="text-primary">MO</span>
            <span className="text-muted-fg text-sm font-normal ml-2">관리자</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-fg">총 {profiles.length}명</span>
            <button onClick={fetchProfiles} className="px-4 py-2 text-sm bg-muted rounded-lg hover:bg-border transition-colors">
              새로고침
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-muted-fg">등록된 프로필이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {profiles.map((p, idx) => {
              const isExpanded = expandedId === p.id;
              const link = linkMap[p.id];

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border transition-all ${
                    p.blocked
                      ? "bg-gray-100 border-gray-200 opacity-60"
                      : "bg-card border-border hover:shadow-md"
                  }`}
                >
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    <span className={`text-sm font-bold w-8 text-center ${p.blocked ? "text-gray-400" : "text-primary"}`}>
                      {idx + 1}
                    </span>
                    <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-fg text-xs">N/A</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${p.blocked ? "line-through text-gray-400" : ""}`}>{p.name}</span>
                        {p.blocked && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">블락</span>}
                      </div>
                      <p className={`text-sm truncate ${p.blocked ? "line-through text-gray-400" : "text-muted-fg"}`}>
                        {p.gender} · {p.birthYear} · {p.height}cm · {p.region} · {p.jobType} · {p.mbti}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlock(p.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          p.blocked
                            ? "bg-success/10 text-success hover:bg-success/20"
                            : "bg-danger/10 text-danger hover:bg-danger/20"
                        }`}
                      >
                        {p.blocked ? "해제" : "블락"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (link) {
                            handleCopyLink(p.id, link.token);
                          } else {
                            handleCreateLink(p.id);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                      >
                        {copiedId === p.id ? "복사됨!" : link ? "링크 복사" : "링크 생성"}
                      </button>
                      <svg className={`w-5 h-5 text-muted-fg transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailItem label="이름" value={p.name} blocked={p.blocked} />
                        <DetailItem label="출생년도" value={p.birthYear} blocked={p.blocked} />
                        <DetailItem label="출생년도 범위" value={p.birthYearRange} blocked={p.blocked} />
                        <DetailItem label="성별" value={p.gender} blocked={p.blocked} />
                        <DetailItem label="거주지" value={p.region} blocked={p.blocked} />
                        <DetailItem label="학력" value={p.education} blocked={p.blocked} />
                        <DetailItem label="키" value={p.height} blocked={p.blocked} />
                        <DetailItem label="직무" value={p.job} blocked={p.blocked} />
                        <DetailItem label="직업 형태" value={p.jobType} blocked={p.blocked} />
                        <DetailItem label="연봉" value={p.salary} blocked={p.blocked} />
                        <DetailItem label="흡연" value={p.smoking} blocked={p.blocked} />
                        <DetailItem label="MBTI" value={p.mbti} blocked={p.blocked} />
                        <DetailItem label="매력포인트" value={p.charm} blocked={p.blocked} />
                        <DetailItem label="연애스타일" value={p.datingStyle} blocked={p.blocked} />
                        <DetailItem label="연락처" value={p.phone} blocked={p.blocked} />
                      </div>
                      <div className="mt-5 pt-4 border-t border-border">
                        <h4 className="text-sm font-semibold text-accent mb-3">이상형 정보</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <DetailItem label="이상형 키" value={p.idealHeight} blocked={p.blocked} />
                          <DetailItem label="이상형 나이" value={p.idealAge} blocked={p.blocked} />
                          <DetailItem label="이상형 거주지" value={p.idealRegion} blocked={p.blocked} />
                          <DetailItem label="이상형 흡연여부" value={p.idealSmoking} blocked={p.blocked} />
                          <DetailItem label="이상형 학력" value={p.idealEducation} blocked={p.blocked} />
                          <DetailItem label="이상형 직업 형태" value={p.idealJobType} blocked={p.blocked} />
                          <DetailItem label="이상형 연봉" value={p.idealSalary} blocked={p.blocked} />
                          <DetailItem label="우선순위" value={p.priority} blocked={p.blocked} />
                        </div>
                      </div>
                      {link && (
                        <div className="mt-4 p-3 bg-accent/5 rounded-xl text-sm">
                          <span className="text-muted-fg">프로필 링크 만료: </span>
                          <span className="font-medium text-accent">{new Date(link.expiresAt).toLocaleDateString("ko-KR")}</span>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-muted-fg">
                        등록일: {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function DetailItem({ label, value, blocked }: { label: string; value: string; blocked: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-fg">{label}</p>
      <p className={`text-sm font-medium ${blocked ? "line-through text-gray-400" : ""}`}>
        {value || "-"}
      </p>
    </div>
  );
}
