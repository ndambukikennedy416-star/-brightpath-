import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAtRiskStudents } from "@/lib/alerts";
import { Badge, Card } from "@/components/ui";
import { kes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER", "DONOR"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const [students, payments, claims] = await Promise.all([
    prisma.student.findMany({
      include: {
        user: { select: { name: true } },
        payments: { where: { status: "DISBURSED" }, select: { amount: true } },
      },
    }),
    prisma.payment.findMany({ where: { status: "DISBURSED" } }),
    prisma.expenseClaim.findMany({ where: { status: { in: ["APPROVED", "DISBURSED"] } } }),
  ]);
  const atRisk = await getAtRiskStudents();

  const totalBudget = students.reduce((s, x) => s + Number(x.totalBudget), 0);
  const totalDisbursed = payments.reduce((s, p) => s + Number(p.amount), 0);
  const byType = new Map<string, number>();
  for (const p of payments) byType.set(p.type, (byType.get(p.type) ?? 0) + Number(p.amount));

  const byMonth = new Map<string, number>();
  for (const p of payments) {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(p.amount));
  }

  const utilization = students
    .map((s) => ({
      name: s.user.name,
      id: s.id,
      status: s.status,
      budget: Number(s.totalBudget),
      disbursed: s.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    }))
    .sort((a, b) => b.disbursed / Math.max(b.budget, 1) - a.disbursed / Math.max(a.budget, 1));

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total budget", kes(totalBudget)],
          ["Total disbursed", kes(totalDisbursed)],
          ["Utilization", totalBudget > 0 ? `${Math.round((totalDisbursed / totalBudget) * 100)}%` : "—"],
          ["At-risk students", `${atRisk.length}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white p-4">
            <div className="text-xl font-bold">{value}</div>
            <div className="text-sm text-zinc-600">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Disbursements by type">
          <ul className="space-y-1 text-sm">
            {[...byType.entries()].map(([type, sum]) => (
              <li key={type} className="flex justify-between rounded-lg border px-3 py-2">
                <span>{type}</span>
                <span className="font-medium">{kes(sum)}</span>
              </li>
            ))}
            {byType.size === 0 && <li>No disbursements yet.</li>}
          </ul>
        </Card>

        <Card title="Disbursements by month">
          <ul className="space-y-1 text-sm">
            {[...byMonth.entries()].sort().reverse().slice(0, 12).map(([month, sum]) => (
              <li key={month} className="flex justify-between rounded-lg border px-3 py-2">
                <span>{month}</span>
                <span className="font-medium">{kes(sum)}</span>
              </li>
            ))}
            {byMonth.size === 0 && <li>No disbursements yet.</li>}
          </ul>
        </Card>
      </div>

      <Card title="Budget utilization per student">
        <ul className="space-y-1 text-sm">
          {utilization.map((u) => {
            const pct = u.budget > 0 ? Math.round((u.disbursed / u.budget) * 100) : 0;
            return (
              <li key={u.id} className="rounded-lg border px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  <span className="font-medium">{u.name}</span>
                  <Badge>{u.status}</Badge>
                  <span className="ml-auto">
                    {kes(u.disbursed)} / {kes(u.budget)} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full bg-black" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={`Approved claims reimbursed (${claims.length})`}>
        <p className="text-sm text-zinc-600">
          Approved expense claims automatically become stipend payouts — counted in disbursements above.
        </p>
      </Card>
    </main>
  );
}
