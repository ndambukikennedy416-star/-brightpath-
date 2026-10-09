import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kes } from "@/lib/format";

export const dynamic = "force-dynamic";

// Donor "Impact Window" (PRD §3.6): aggregate only, no PII.
export default async function DonorImpactPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER", "DONOR"].includes(session.user.role)) {
    redirect("/dashboard");
  }
  const [totalDisbursed, studentsFunded, records] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "DISBURSED" },
    }),
    prisma.student.count({ where: { status: { in: ["ACTIVE", "GRADUATED"] } } }),
    prisma.academicRecord.findMany({ select: { gpa: true } }),
  ]);

  const gpas = records
    .map((r) => (r.gpa == null ? null : Number(r.gpa)))
    .filter((g): g is number => g != null);
  const avgGpa =
    gpas.length > 0 ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : "—";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 text-center">
      <h1 className="text-2xl font-semibold">Your Impact</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold">
            {kes(totalDisbursed._sum.amount ?? 0)}
          </div>
          <div className="text-sm text-zinc-600">Disbursed</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold">{studentsFunded}</div>
          <div className="text-sm text-zinc-600">Students funded</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold">{avgGpa}</div>
          <div className="text-sm text-zinc-600">Average GPA</div>
        </div>
      </div>
      <p className="text-sm text-zinc-600">
        Aggregate outcomes only — no student personal data shown.
      </p>
    </main>
  );
}
