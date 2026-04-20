import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/female", "/male", "/admin"];
const IS_DEV = process.env.NODE_ENV === "development";

function requiredRoleFor(pathname: string): "female" | "male" | "admin" | null {
  if (pathname === "/female" || pathname.startsWith("/female/")) return "female";
  if (pathname === "/male" || pathname.startsWith("/male/")) return "male";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return null;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const required = requiredRoleFor(pathname);
  if (!required) {
    return NextResponse.next({ request });
  }

  // 개발 환경에서는 게이트 전부 bypass (로컬 디버깅 편의)
  if (IS_DEV) {
    return NextResponse.next({ request });
  }

  // 피드백용 미리보기 쿠키 - 랜딩의 남성/여성/관리자 버튼에서 세팅.
  // 추후 피드백 완료 후 이 블록만 제거하면 됨.
  if (request.cookies.get("preview_bypass")?.value === "1") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("message", "login_required");
    return NextResponse.redirect(url);
  }

  // 역할(성별/관리자) 기반 접근 제어
  const [{ data: adminRow }, { data: userRow }] = await Promise.all([
    supabase.from("admins").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("users").select("role, status").eq("id", user.id).maybeSingle(),
  ]);

  const isAdmin = !!adminRow;
  const gender = (userRow?.role as "male" | "female" | undefined) ?? null;

  // 관리자 페이지는 admins 테이블에 있어야만 허용
  if (required === "admin") {
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = gender === "male" ? "/male" : gender === "female" ? "/female" : "/";
      url.searchParams.set("message", "forbidden");
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // /male, /female: 관리자는 모든 페이지 접근 허용(운영상 확인 필요)
  if (isAdmin) {
    return supabaseResponse;
  }

  // 미승인 회원은 메인으로
  if (userRow?.status !== "active") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("message", "pending_or_blocked");
    return NextResponse.redirect(url);
  }

  // 성별과 경로가 다르면 본인 성별 페이지로 리다이렉트
  if (gender !== required) {
    const url = request.nextUrl.clone();
    url.pathname = gender === "male" ? "/male" : gender === "female" ? "/female" : "/";
    url.searchParams.set("message", "wrong_section");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
