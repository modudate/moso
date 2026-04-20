"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { regionLabel, smokingLabel } from "@/lib/options";
import PhotoCarousel from "@/components/PhotoCarousel";

type Status = "loading" | "ok" | "expired" | "limit" | "error";

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
        if (res.status === 429) { setStatus("limit"); return; }
        if (!res.ok) { const d = await res.json(); setErrorMsg(d.error || "오류 발생"); setStatus("error"); return; }
        setProfile(await res.json());
        setStatus("ok");
      } catch { setErrorMsg("서버 연결 실패"); setStatus("error"); }
    })();
  }, [token]);

  if (status === "loading") return <main className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></main>;

  if (status !== "ok" || !profile) return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4 mx-auto max-w-[430px]">
      <div className="text-center space-y-5">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-bold">{status === "expired" ? "링크가 만료되었습니다" : status === "limit" ? "접근 횟수 초과" : "오류"}</h2>
        <p className="text-muted-fg">{status === "expired" ? "이 프로필 링크는 5일이 지나 만료되었습니다." : status === "limit" ? "이 링크의 최대 접근 횟수에 도달했습니다." : errorMsg}</p>
        <button onClick={() => router.push("/")} className="px-6 py-3 text-white rounded-xl font-semibold" style={{ backgroundColor: "#ff8a3d" }}>홈으로</button>
      </div>
    </main>
  );

  const age = new Date().getFullYear() - profile.birthYear + 1;

  return (
    <main className="min-h-screen bg-white mx-auto max-w-[430px]">
      <PhotoCarousel photos={profile.photoUrls} alt={profile.nickname} />

      <div className="px-5 pt-6 pb-4">
        <h1 className="text-[28px] font-bold text-foreground">{profile.nickname}, {age}</h1>
      </div>

      <div className="px-5 divide-y divide-border">
        <InfoRow icon={<IC d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />} label="직장" value={profile.workplace} />
        <InfoRow icon={<IC d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />} label="직업" value={profile.job} />
        <InfoRow icon={<IC d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />} label="근무패턴" value={profile.workPattern} />
        <InfoRow icon={<IC d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} label="연봉" value={profile.salary} />
        <InfoRow icon={<IC d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />} label="학력" value={profile.education} />
        <InfoRow icon={<IC d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />} label="MBTI" value={profile.mbti} />
        <InfoRow icon={<IC d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />} label="흡연" value={smokingLabel(profile.smoking)} />
        <InfoRow icon={<IC d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5m4.5 4.5V4.5" />} label="키" value={`${profile.height}cm`} />
        <InfoRow icon={<IC d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />} label="거주지" value={regionLabel(profile.city, profile.district)} />
      </div>

      {profile.charm && (
        <div className="px-5 pt-8 pb-2">
          <h2 className="text-xl font-bold text-foreground mb-3">저의 매력은</h2>
          <p className="text-[15px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{profile.charm}</p>
        </div>
      )}
      {profile.charmPhoto && (
        <div className="mt-3 w-full aspect-[3/4] bg-muted">
          <img src={profile.charmPhoto} alt={`${profile.nickname} 매력`} className="w-full h-full object-cover" />
        </div>
      )}

      {profile.datingStyle && (
        <div className="px-5 pt-8 pb-2">
          <h2 className="text-xl font-bold text-foreground mb-3">연인이 생기면 하고 싶은 일은</h2>
          <p className="text-[15px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{profile.datingStyle}</p>
        </div>
      )}
      {profile.datePhoto && (
        <div className="mt-3 w-full aspect-[3/4] bg-muted">
          <img src={profile.datePhoto} alt={`${profile.nickname} 연인`} className="w-full h-full object-cover" />
        </div>
      )}

      <p className="text-center text-xs text-muted-fg/50 py-6">모두의 모임 · 이 링크는 생성일로부터 5일 후 만료됩니다</p>
    </main>
  );
}

function IC({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5 text-muted-fg/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center py-4 gap-3">
      <span className="w-7 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="text-sm text-muted-fg w-14 flex-shrink-0">{label}</span>
      <span className="text-[15px] font-medium text-foreground">{value}</span>
    </div>
  );
}
