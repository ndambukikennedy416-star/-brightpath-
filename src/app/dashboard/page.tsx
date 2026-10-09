import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAtRiskStudents } from "@/lib/alerts";
import { getBudgetTotals, getPendingCounts } from "@/lib/cached";
import { getOwnStudentId } from "@/lib/rbac";
import { Card } from "@/components/ui";
import { kes } from "@/lib/format";

export const dynamic = "force-dynamic";

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, name } = session.user;

  if (role === "STUDENT") {
    const ownId = await getOwnStudentId(session.user.id);
    if (ownId) redirect(`/students/${ownId}`);
  }
  if (role === "FINANCE_OFFICER") redirect("/finance");
  if (role === "DONOR") redirect("/donors/impact");
  if (role === "EXTERNAL_PARTNER") redirect("/partners");

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [
    activeStudents, newStudents,
    pendingCounts, newPayments,
    newInvoices,
    newClaims,
    emergencyClaims,
    lessons,
    totals,
    atRisk,
  ] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.student.count({ where: { createdAt: { gte: weekAgo } } }),
    // Shared with Nav via React.cache — one COUNT set per request.
    getPendingCounts(),
    prisma.payment.count({ where: { status: "PENDING", createdAt: { gte: weekAgo } } }),
    prisma.invoice.count({ where: { status: "PENDING", createdAt: { gte: weekAgo } } }),
    prisma.expenseClaim.count({ where: { status: "PENDING", createdAt: { gte: weekAgo } } }),
    prisma.expenseClaim.count({ where: { status: "PENDING", isEmergency: true } }),
    prisma.financialLiteracyLesson.count(),
    // Shared aggregates via React.cache.
    getBudgetTotals(),
    getAtRiskStudents(),
  ]);
  const pendingPayments = pendingCounts.payments;
  const pendingInvoices = pendingCounts.invoices;
  const pendingClaims = pendingCounts.claims;

  const totalDisbursed = totals.disbursed;
  const totalBudget = totals.budget;
  const utilization = totalBudget > 0 ? Math.round((totalDisbursed / totalBudget) * 100) : 0;

  const stats = [
    { label: "Active students", value: activeStudents, delta: newStudents, href: "/students", icon: ICONS.users },
    { label: "Pending payments", value: pendingPayments, delta: newPayments, href: "/finance", icon: ICONS.dollar },
    { label: "Pending invoices", value: pendingInvoices, delta: newInvoices, href: "/finance", icon: ICONS.file },
    { label: "Pending claims", value: pendingClaims, delta: newClaims, href: "/finance", icon: ICONS.file },
    { label: "Emergency requests", value: emergencyClaims, delta: 0, href: "/finance", icon: ICONS.heart, urgent: emergencyClaims > 0 },
    { label: "Literacy lessons", value: lessons, delta: 0, href: "/literacy", icon: ICONS.book },
  ];

  const quickActions = [
    { label: "Onboard accepted beneficiary", hint: "Create a student account", href: "/students/new" },
    { label: "Bulk import beneficiaries", hint: "CSV paste, one per line", href: "/students/import" },
    { label: "Review finance queues", hint: "Payments, invoices, claims", href: "/finance" },
    { label: "Budget utilization & reports", hint: "Disbursement summaries", href: "/reports" },
  ];

  return (
    <main className="relative mx-auto max-w-6xl space-y-6 overflow-hidden rounded-2xl p-4 md:p-6">
      {/* Faint team-photo backdrop spanning the content column, from the nav edge. */}
      <div aria-hidden className="pointer-events-none fixed inset-y-0 left-0 right-0 md:left-60">
        <Image
          src="/team.jpg"
          alt=""
          fill
          sizes="100vw"
          loading="lazy"
          style={{ objectFit: "cover", objectPosition: "center" }}
          className="opacity-40"
        />
        <div className="absolute inset-0 bg-white/40" />
      </div>
      <div className="relative space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-800">
            Brightpath Kenya · {today}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">
            Good day, {name}
          </h1>
        </div>
        <p className="text-sm tabular-nums font-semibold text-stone-800">
          <span className="font-semibold text-stone-900">{kes(totalDisbursed)}</span>{" "}
          disbursed of {kes(totalBudget)} ({utilization}%)
        </p>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-green-800" style={{ width: `${Math.min(utilization, 100)}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between text-stone-400">
              <Icon d={s.icon} />
              {s.urgent ? (
                <span className="rounded bg-red-700 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  URGENT
                </span>
              ) : (
                <span className="text-xs tabular-nums text-stone-400">
                  {s.delta > 0 ? `+${s.delta} this week` : "—"}
                </span>
              )}
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-stone-900">
              {s.value}
            </div>
            <div className="mt-0.5 text-[13px] font-medium text-stone-500">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-3">
          <Card title={`Students needing attention (${atRisk.length})`}>
            {atRisk.length === 0 ? (
              <p className="text-sm text-stone-500">
                Nothing flagged. All active students are above the GPA and attendance thresholds.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {atRisk.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 py-2">
                    <Link href={`/students/${s.id}`} className="font-semibold text-stone-900 hover:underline">
                      {s.name}
                    </Link>
                    <span className="text-stone-500">
                      {s.schoolName} · {s.term}
                    </span>
                    <span className="ml-auto text-[13px] font-medium text-red-700">
                      {s.reasons.join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/academics" className="mt-3 inline-block text-sm font-semibold text-green-900 hover:underline">
              Open monitoring & evaluation →
            </Link>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card title="Quick actions">
            <div className="divide-y divide-stone-100 text-sm">
              {quickActions.map((a) => (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className="group flex items-center justify-between gap-2 py-2.5"
                >
                  <span>
                    <span className="block font-semibold text-stone-900 group-hover:underline">
                      {a.label}
                    </span>
                    <span className="block text-[13px] text-stone-500">{a.hint}</span>
                  </span>
                  <span className="text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-green-900">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </main>
  );
}
