"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const AUTH_ROUTES = ["/login", "/register", "/change-password"];

// The sidebar belongs to the signed-in app shell — never on auth pages,
// even when a session already exists (e.g. visiting /login while signed in).
export default function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return null;
  }
  return <>{children}</>;
}
