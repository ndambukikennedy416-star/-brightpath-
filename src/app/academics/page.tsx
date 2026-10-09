import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ATTENDANCE_THRESHOLD, GPA_THRESHOLD, getAtRiskStudents } from "@/lib/alerts";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AcademicsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const atRisk = await getAtRiskStudents();
  const recent = await prisma.academicRecord.findMany({
    include: { student: { include: { user: { select: { name: true } } } } },
    orderBy: { recordedAt: "desc" },
    take: 30,
  });

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Monitoring & Evaluation</h1>
      <p className="text-sm text-zinc-600">
        Auto-flags: GPA below {GPA_THRESHOLD} or attendance below {ATTENDANCE_THRESHOLD}%.
      </p>

      <Card title={`At-risk students (${atRisk.length})`}>
        <ul className="space-y-2 text-sm">
          {atRisk.map((s) => (
            <li key={s.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <Link href={`/students/${s.id}`} className="font-medium underline">
                {s.name}
              </Link>{" "}
              <Badge tone="red">{s.reasons.join(" · ")}</Badge>
              <div className="text-zinc-600">
                {s.schoolName} · {s.term} · GPA {s.gpa ?? "—"} · {s.attendance ?? "—"}%
              </div>
            </li>
          ))}
          {atRisk.length === 0 && <li>No students currently breaching thresholds.</li>}
        </ul>
      </Card>

      <Card title="Latest records">
        <ul className="space-y-1 text-sm">
          {recent.map((r) => (
            <li key={r.id} className="rounded-lg border px-3 py-2">
              <Link href={`/students/${r.studentId}`} className="underline">
                {r.student.user.name}
              </Link>{" "}
              · {r.term} · GPA {r.gpa?.toString() ?? "—"} · {r.attendance?.toString() ?? "—"}%
            </li>
          ))}
          {recent.length === 0 && <li>No records yet. Enter grades from a student profile.</li>}
        </ul>
      </Card>
    </main>
  );
}
