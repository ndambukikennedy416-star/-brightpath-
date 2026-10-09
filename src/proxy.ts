// Next.js 16: `proxy.ts` replaces `middleware.ts` (same behavior, new name).
// Optimistic checks only — full session/role verification happens in
// Server Components and Server Actions via `auth()`.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/signup", "/favicon.ico", "/logo.jpg", "/logo.png", "/banner.jpg", "/team.jpg"];

// Path prefix → roles allowed (optimistic; pages re-verify via auth()).
// NOTE: "/students" must precede "/student" — prefix matching would otherwise
// route staff pages like /students/123 into the student-only rule.
const ROLE_ROUTES: { prefix: string; roles: string[] }[] = [
  { prefix: "/students", roles: ["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT", "STUDENT"] },
  { prefix: "/student", roles: ["STUDENT"] },
  { prefix: "/finance", roles: ["ADMIN", "FINANCE_OFFICER"] },
  { prefix: "/academics", roles: ["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT"] },
  { prefix: "/literacy", roles: ["FINANCE_OFFICER", "FIELD_AGENT", "STUDENT"] },
  { prefix: "/reports", roles: ["ADMIN", "FINANCE_OFFICER", "DONOR"] },
  { prefix: "/partners", roles: ["ADMIN", "FINANCE_OFFICER", "EXTERNAL_PARTNER"] },
  { prefix: "/donors", roles: ["ADMIN", "FINANCE_OFFICER", "DONOR"] },
  { prefix: "/audit", roles: ["ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard", roles: ["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT", "STUDENT", "EXTERNAL_PARTNER", "DONOR"] },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase portal session refresh (runs on every request so OAuth tokens
  // stay valid; the portal reads the session, never the legacy JWT).
  if (
    pathname.startsWith("/portal") ||
    pathname.startsWith("/auth/") ||
    pathname === "/portal-login"
  ) {
    const res = NextResponse.next({ request });
    await createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (
            cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
          ) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      }
    ).auth.getUser();
    if (pathname.startsWith("/portal") || pathname === "/portal-login") return res;
  }

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  }).catch(() => null);

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const rule = ROLE_ROUTES.find((r) => pathname.startsWith(r.prefix));
  const role = (token as { role?: string }).role;
  if (rule && role && !rule.roles.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets, public images, uploads, and NextAuth routes so the
  // edge function only runs for pages that need auth checks. Without this,
  // proxy runs on every /logo.jpg, /banner.jpg, /team.jpg, CSS, and JS hit.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|uploads|.*\\.(?:jpg|jpeg|png|webp|avif|svg|ico|css|js|woff2?)).*)",
  ],
}
