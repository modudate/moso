"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { regionLabel } from "@/lib/options";

type Status = "loading" | "ok" | "expired" | "error";

export default function ProfileViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/profiles/link?token=${token}`);
        if (res.status === 410) { setStatus("expired"); return; }
        if (!res.ok) { const d = await res.json(); setErrorMsg(d.error || "오류 발생"); setStatus("error"); return; }
        setProfile(await res.json());
        setStatus("ok");
      } catch { setErrorMsg("서버 연결 실패"); setStatus("error"); }
    })();
  }, [token]);

  if (status === "loading") return <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></main>;

  if (status === "expired") return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white px-4">
      <div className="bg-card rounded-3xl shadow-xl p-10 text-center space-y-5 max-w-md w-full">
        <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-bold">링크가 만료되었습니다</h2>
        <p className="text-muted-fg">이 프로필 링크는 5일이 지나 만료되었습니다.</p>
        <button onClick={() => router.push("/")} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">홈으로</button>
      </div>
    </main>
  );

  if (status === "error") return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white px-4">
      <div className="bg-card rounded-3xl shadow-xl p-10 text-center space-y-5 max-w-md w-full">
        <h2 className="text-2xl font-bold">오류</h2>
        <p className="text-muted-fg">{errorMsg}</p>
        <button onClick={() => router.push("/")} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">홈으로</button>
      </div>
    </main>
  );

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-light via-background to-white py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
          <div className="relative bg-gradient-to-br from-primary to-primary-dark h-48 flex items-end justify-center">
            <div className="absolute -bottom-14 w-28 h-28 rounded-full border-4 border-white bg-muted overflow-hidden shadow-lg">
              {profile.imageUrl ? <img src={profile.imageUrl} alt="" className="w-full h-full object-cover" /> :
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary/30">{profile.name?.[0] || "?"}</div>}
            </div>
          </div>
          <div className="pt-18 pb-8 px-6 space-y-6">
            <div className="text-center pt-4">
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-muted-fg mt-1">{profile.gender} · {profile.birthYear} · {regionLabel(profile.city, profile.district)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoCard label="키" value={`${profile.height}cm`} />
              <InfoCard label="학력" value={profile.education} />
              <InfoCard label="직업 형태" value={profile.jobType} />
              <InfoCard label="연봉" value={profile.salary} />
              <InfoCard label="흡연" value={profile.smoking} />
              <InfoCard label="MBTI" value={profile.mbti} />
            </div>
            {profile.job && <div className="bg-muted rounded-xl p-4"><p className="text-xs text-muted-fg mb-1">직무</p><p className="text-sm font-medium">{profile.job}</p></div>}
            {profile.charm && <div className="bg-primary-light/60 rounded-xl p-4"><p className="text-xs text-primary-dark mb-1">매력포인트</p><p className="text-sm font-medium">{profile.charm}</p></div>}
            {profile.datingStyle && <div className="bg-accent/5 rounded-xl p-4"><p className="text-xs text-accent mb-1">연애스타일</p><p className="text-sm font-medium">{profile.datingStyle}</p></div>}
          </div>
        </div>
        <p className="text-center text-xs text-muted-fg/50 mt-6">OURMO · 이 링크는 생성일로부터 5일 후 만료됩니다</p>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="bg-muted/60 rounded-xl p-3 text-center"><p className="text-xs text-muted-fg">{label}</p><p className="text-sm font-semibold mt-0.5">{value || "-"}</p></div>;
}
