"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import ProfileDetailView from "@/components/ProfileDetailView";

export default function FemaleMyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const meRes = await fetch("/api/me");
    const { user: me } = await meRes.json();
    if (!me?.id) {
      setLoading(false);
      return;
    }
    const profileRes = await fetch(`/api/profiles?role=female&status=active`);
    const list: User[] = await profileRes.json();
    setUser(list.find((u) => u.id === me.id) || null);
    setLoading(false);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <main className="min-h-screen bg-white mx-auto max-w-[430px] relative pb-10">
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#ff8a3d" }}
      >
        <button
          onClick={() => router.back()}
          className="text-white"
          aria-label="뒤로가기"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="text-white font-bold">내 프로필 미리보기</span>
        <div className="w-6" />
      </div>

      {!user ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-fg gap-4 px-6 text-center">
          <p>프로필 정보를 불러올 수 없습니다.</p>
          <button
            onClick={() => router.push("/female")}
            className="px-4 py-2 bg-primary text-white rounded-xl font-medium"
          >
            돌아가기
          </button>
        </div>
      ) : (
        <>
          <div className="bg-primary-light/40 px-5 py-2.5 text-xs text-primary-dark text-center font-medium border-b border-primary-light">
            상대방에게는 이렇게 보여요
          </div>
          <ProfileDetailView user={user} />
        </>
      )}
    </main>
  );
}
