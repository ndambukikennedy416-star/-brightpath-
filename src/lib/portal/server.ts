import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (read-only cookies).
          }
        },
      },
    }
  );
}

// Service-role client for server-side writes the RLS policies don't cover
// (e.g. admin creating portal payments). Never import into client code.
export async function createServiceClient() {
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export type PortalRole = "admin" | "financial_officer" | "monitor_evaluator" | "student";

// Returns the signed-in portal user + role, or null. Every portal page and
// portal server action must call this first (RLS is the second layer).
export async function requirePortalRole(...roles: PortalRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile || !roles.includes(profile.role as PortalRole)) return null;
  return { supabase, user, profile: profile as { id: string; email: string; full_name: string; role: PortalRole } };
}
