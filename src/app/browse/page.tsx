"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProfileSummary {
  id: string;
  imageUrl: string;
  name: string;
  birthYear: string;
  height: string;
  region: string;
  jobType: string;
  mbti: string;
  blocked: boolean;
}

export default function BrowsePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      const males = data.filter(
        (p: ProfileSummary & { gender: string }) => p.gender === "남자" && !p.blocked
      );
      setProfiles(males);
      setLoading(false);
    })();
  }, []);

  const handleClick = async (profileId: string) => {
    setNavigatingId(profileId);
    const res = await fetch("/api/profiles/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    const data = await res.json();
    router.push(`/profile/${data.token}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            OUR<span className="text-primary">MO</span>
            <span className="text-muted-fg text-sm font-normal ml-2">남성 프로필</span>
          </h1>
          <span className="text-sm text-muted-fg">{profiles.length}명</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 text-muted-fg">등록된 남성 프로필이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {profiles.map((p) => (
              <div
                key={p.id}
                onClick={() => !navigatingId && handleClick(p.id)}
                className="group cursor-pointer rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-primary/20">
                      {p.name?.[0] || "?"}
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Name on image */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <h3 className="text-white font-bold text-base sm:text-lg drop-shadow-md">{p.name}</h3>
                    <p className="text-white/80 text-xs sm:text-sm drop-shadow-md mt-0.5">
                      {p.birthYear} · {p.height}cm
                    </p>
                  </div>
                  {/* Loading overlay */}
                  {navigatingId === p.id && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 sm:p-4 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-primary-light text-primary text-xs font-medium rounded-full">{p.region}</span>
                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full">{p.jobType}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-muted text-muted-fg text-xs rounded-full">{p.mbti}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
