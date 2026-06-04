import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { getUserById } from "@/lib/db";

// 프로필 공유 링크의 OG 메타데이터 (카카오톡/슬랙 등 공유 시 미리보기)
// 제목: "닉네임 / 나이 / MBTI"
// 주의: 여기서는 access_count 를 증가시키지 않는다 (크롤러가 열람 횟수를 소진하지 않도록).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  const fallback: Metadata = {
    title: "모두의 소개팅",
    description: "모두의 소개팅 프로필",
    robots: { index: false, follow: false },
  };

  try {
    const service = await createServiceClient();
    const { data: link } = await service
      .from("profile_links")
      .select("user_id")
      .eq("token", token)
      .single();
    if (!link) return fallback;

    const user = await getUserById(link.user_id);
    if (!user) return fallback;

    const age = new Date().getFullYear() - user.birthYear + 1;
    const parts = [user.nickname, `${age}세`, user.mbti].filter(Boolean);
    const title = parts.join(" / ");
    const description = "모두의 소개팅 프로필";

    // OG 이미지는 사이트 기본 이미지(/og.png)로 통일
    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        type: "profile",
        images: ["/og.png"],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og.png"],
      },
    };
  } catch {
    return fallback;
  }
}

export default function ProfileTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
