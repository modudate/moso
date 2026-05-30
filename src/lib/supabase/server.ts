import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출 시 무시
          }
        },
      },
    },
  );
}

// service_role 클라이언트는 사용자 세션이 없는 stateless 클라이언트이므로
// 매 요청마다 새로 만들 필요가 없다. 모듈 레벨에서 1회만 생성해 재사용한다.
// (동시접속이 많을 때 매번 createClient + 동적 import 하던 오버헤드 제거)
let _serviceClient: SupabaseClient | null = null;

export async function createServiceClient() {
  if (_serviceClient) return _serviceClient;
  _serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
  return _serviceClient;
}
