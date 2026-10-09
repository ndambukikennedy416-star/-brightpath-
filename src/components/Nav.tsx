import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";
import { getAtRiskStudents } from "@/lib/alerts";
import {
  getPendingCounts,
  getStudentsNeedingSetupCount,
} from "@/lib/cached";
import DarkModeToggle from "@/components/DarkModeToggle";

const LINKS: { href: string; label: string; roles: string[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT", "STUDENT", "EXTERNAL_PARTNER", "DONOR"] },
  { href: "/students", label: "Students", roles: ["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT"] },
  { href: "/finance", label: "Finance", roles: ["ADMIN", "FINANCE_OFFICER"] },
  { href: "/academics", label: "M&E", roles: ["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT"] },
  { href: "/literacy", label: "Literacy", roles: ["FINANCE_OFFICER", "FIELD_AGENT", "STUDENT"] },
  { href: "/reports", label: "Reports", roles: ["ADMIN", "FINANCE_OFFICER", "DONOR"] },
  { href: "/partners", label: "Partners", roles: ["ADMIN", "FINANCE_OFFICER", "EXTERNAL_PARTNER"] },
  { href: "/donors/impact", label: "Impact", roles: ["ADMIN", "FINANCE_OFFICER", "DONOR"] },
  { href: "/audit", label: "Audit", roles: ["ADMIN"] },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
  { href: "/student", label: "My scholarship", roles: ["STUDENT"] },
  { href: "/student/application-status", label: "Status", roles: ["STUDENT"] },
  { href: "/student/profile", label: "Profile", roles: ["STUDENT"] },
];

export default async function Nav() {
  const session = await auth();
  if (!session?.user) return null;
  const { role, name } = session.user;
  const links = LINKS.filter((l) => l.roles.includes(role));
  const initial = (name?.[0] ?? role[0] ?? "?").toUpperCase();

  // Notification bell: live queue counts, links somewhere useful per role.
  // Wrapped defensively — Nav renders inside the root layout, so a transient
  // DB failure here must degrade to an empty bell, never crash every page.
  let bellHref = "/dashboard";
  let bellCount = 0;
  let bellTitle = "Notifications";
  try {
    if (role === "ADMIN") {
    const [counts, setupNeeded] = await Promise.all([
      getPendingCounts(),
      // Single COUNT query — previously findMany over all STUDENT users.
      getStudentsNeedingSetupCount(),
    ]);
    const p = counts.payments;
    const i = counts.invoices;
    const c = counts.claims;
    bellCount = p + i + c + setupNeeded;
    bellHref = setupNeeded > 0 ? "/admin/users" : "/finance";
    bellTitle = `${p} payments, ${i} invoices, ${c} claims pending; ${setupNeeded} new students need setup`;
  } else if (role === "FINANCE_OFFICER") {
    const counts = await getPendingCounts();
    const p = counts.payments;
    const i = counts.invoices;
    const c = counts.claims;
    bellCount = p + i + c;
    bellHref = "/finance";
    bellTitle = `${p} payments, ${i} invoices, ${c} claims pending`;
  } else if (role === "FIELD_AGENT") {
    bellCount = (await getAtRiskStudents()).length;
    bellHref = "/academics";
    bellTitle = `${bellCount} at-risk students`;
  }
  } catch {
    // Keep defaults: silent bell until the database is reachable again.
  }

  return (
    <aside className="bg-green-950 text-white shadow md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 md:mx-0 md:max-w-none md:flex-1 md:flex-col md:items-stretch md:gap-1 md:p-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-[15px] font-semibold md:px-1">
          <Image
            src="/logo.jpg"
            alt="Brightpath logo"
            width={32}
            height={32}
            loading="lazy"
            className="h-8 w-8 rounded-full object-cover ring-1 ring-white/40"
          />
          <span>
            Brightpath
            <span className="hidden text-xs font-normal text-white/60 sm:inline"> Kenya</span>
          </span>
        </Link>
        <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80 md:self-start">
          {role.replace(/_/g, " ")}
        </span>
        <nav className="flex flex-wrap gap-0.5 text-sm md:mt-4 md:flex-col md:gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-white/75 transition hover:bg-white/10 hover:text-white md:block"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0 md:mt-auto md:border-t md:border-white/15 md:pt-3">
          <DarkModeToggle />
          <Link
            href={bellHref}
            title={bellTitle}
            aria-label={bellTitle}
            className="relative rounded-full p-2 text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {bellCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold">
                {bellCount > 99 ? "99+" : bellCount}
              </span>
            )}
          </Link>
          <span
            title={name ?? role}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-green-950"
          >
            {initial}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-white/25 px-3 py-1.5 text-sm transition hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
