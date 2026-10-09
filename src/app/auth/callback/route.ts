import { NextResponse } from "next/server";
import { createClient } from "@/lib/portal/server";

const DASHBOARDS: Record<string, string> = {
  admin: "/portal/admin",
  financial_officer: "/portal/finance",
  monitor_evaluator: "/portal/me",
  student: "/portal/student",
};

// OAuth + email-link callback: exchange the code, read the profile role
// (row created by the auth trigger), and land on the correct dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("profiles").select("role").eq("id", user.id).single()
        : { data: null };
      const dest = (profile?.role && DASHBOARDS[profile.role]) || "/portal";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }
  return NextResponse.redirect(`${origin}/portal-login?error=auth`);
}
