import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const userId = data.user.id;

      const [{ data: dbUser }, { data: adminRow }] = await Promise.all([
        supabase.from("users").select("role, status").eq("id", userId).single(),
        supabase.from("admins").select("id").eq("id", userId).single(),
      ]);

      if (adminRow) {
        return NextResponse.redirect(`${origin}/admin`);
      }

      if (!dbUser) {
        return NextResponse.redirect(`${origin}/register`);
      }

      const statusRedirects: Record<string, string> = {
        pending: "/pending",
        blocked: "/blocked",
        rejected: "/rejected",
      };
      if (statusRedirects[dbUser.status]) {
        return NextResponse.redirect(`${origin}${statusRedirects[dbUser.status]}`);
      }

      return NextResponse.redirect(
        `${origin}/${dbUser.role === "female" ? "female" : "male"}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/?message=auth_error`);
}
