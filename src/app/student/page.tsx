import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnStudentId } from "@/lib/rbac";
import { Badge, Card, statusTone } from "@/components/ui";
import { kes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const studentId = await getOwnStudentId(session.user.id);
  const student = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { name: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 10 },
          academicRecords: { orderBy: { recordedAt: "desc" }, take: 3 },
          lessonProgress: { where: { completed: true } },
        },
      })
    : null;

  if (!student) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-semibold">My scholarship</h1>
        <Card>
          <p className="text-sm text-zinc-600">
            No beneficiary profile is linked to this account yet. Please contact your
            administrator to complete your setup.
          </p>
        </Card>
      </main>
    );
  }

  const upcoming = student.payments.filter((p) => p.status === "PENDING" || p.status === "APPROVED");
  const received = student.payments
    .filter((p) => p.status === "DISBURSED")
    .reduce((s, p) => s + Number(p.amount), 0);
  const latestTerm = student.academicRecords[0];

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Hello, {student.user.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          {student.schoolName} · Year {student.currentYear} ·{" "}
          <Badge tone={statusTone(student.status)}>{student.status}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold tabular-nums">{kes(received)}</div>
          <div className="text-sm text-zinc-600">Received so far</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold tabular-nums">{kes(student.totalBudget)}</div>
          <div className="text-sm text-zinc-600">Total award</div>
        </div>
      </div>

      <Card title="Next disbursement">
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-600">Nothing scheduled right now.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {upcoming.slice(0, 3).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              >
                <span className="font-medium">{p.type}</span>
                <span>{kes(p.amount)}</span>
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent activity">
        <ul className="space-y-1 text-sm">
          {student.payments.slice(0, 5).map((p) => (
            <li key={p.id} className="rounded-lg border px-3 py-2">
              Payment {p.type} · {kes(p.amount)} · {p.status} ·{" "}
              {p.createdAt.toLocaleDateString()}
            </li>
          ))}
          {latestTerm && (
            <li className="rounded-lg border px-3 py-2">
              Grades posted for {latestTerm.term}
              {latestTerm.gpa != null ? ` · GPA ${Number(latestTerm.gpa)}` : ""}
            </li>
          )}
          {student.payments.length === 0 && !latestTerm && (
            <li className="text-zinc-600">No activity yet.</li>
          )}
        </ul>
      </Card>

      <p className="flex flex-wrap gap-4 text-sm">
        <Link href="/student/application-status" className="font-medium underline">
          Application status →
        </Link>
        <Link href="/student/profile" className="font-medium underline">
          My profile →
        </Link>
        <Link href="/literacy" className="font-medium underline">
          Financial literacy →
        </Link>
      </p>
    </main>
  );
}
