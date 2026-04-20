import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ user: null });

  const service = await createServiceClient();
  const [{ data: u }, { data: admin }] = await Promise.all([
    service.from("users").select("id, role, status, email").eq("id", user.id).maybeSingle(),
    service.from("admins").select("id").eq("id", user.id).maybeSingle(),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: u?.role ?? null,
      status: u?.status ?? null,
      isAdmin: !!admin,
    },
  });
}
