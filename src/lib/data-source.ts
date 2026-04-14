// 데이터 소스 추상화
// NEXT_PUBLIC_SUPABASE_URL이 설정되면 Supabase DB, 아니면 in-memory store 사용

export function useSupabase(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}
