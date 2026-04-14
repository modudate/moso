import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, role, status")
          .eq("id", user.id)
          .single();

        if (!dbUser) {
          return NextResponse.redirect(`${origin}/register`);
        }

        if (dbUser.status === "pending") {
          return NextResponse.redirect(`${origin}/pending`);
        }
        if (dbUser.status === "blocked") {
          return NextResponse.redirect(`${origin}/blocked`);
        }
        if (dbUser.status === "rejected") {
          return NextResponse.redirect(`${origin}/rejected`);
        }

        const isAdmin = await checkAdmin(supabase, user.id);
        if (isAdmin) {
          return NextResponse.redirect(`${origin}/admin`);
        }

        if (dbUser.role === "female") {
          return NextResponse.redirect(`${origin}/female`);
        }
        return NextResponse.redirect(`${origin}/male`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/?message=auth_error`);
}

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("admins")
    .select("id")
    .eq("id", userId)
    .single();
  return !!data;
}
