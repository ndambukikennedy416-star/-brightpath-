import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnStudentId } from "@/lib/rbac";
import { Badge, Card, statusTone } from "@/components/ui";

export const dynamic = "force-dynamic";

function Step({
  done,
  title,
  detail,
}: {
  done: boolean;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done ? "bg-green-700 text-white" : "border border-stone-300 text-stone-400"
        }`}
      >
        {done ? "✓" : "·"}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-zinc-600">{detail}</p>
      </div>
    </li>
  );
}

export default async function ApplicationStatusPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const studentId = await getOwnStudentId(session.user.id);
  const student = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { name: true } },
          documents: { orderBy: { createdAt: "desc" } },
          academicRecords: { orderBy: { recordedAt: "desc" } },
          payments: {
            where: { status: "DISBURSED" },
            orderBy: { createdAt: "desc" },
          },
          lessonProgress: { where: { completed: true } },
        },
      })
    : null;

  if (!student) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-semibold">Application status</h1>
        <Card>
          <p className="text-sm text-zinc-600">
            No beneficiary profile is linked to this account yet. Please contact your
            administrator to complete your setup.
          </p>
        </Card>
      </main>
    );
  }

  const verifiedDocs = student.documents.filter((d) => d.status === "VERIFIED").length;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Application status</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          {student.user.name} · {student.schoolName} ·{" "}
          <Badge tone={statusTone(student.status)}>{student.status}</Badge>
        </p>
      </div>

      <Card title="Progress timeline">
        <ul className="space-y-4">
          <Step done title="Account created" detail="Your sign-in is active." />
          <Step
            done={Boolean(student.phone || student.mobileMoneyNumber)}
            title="Contact & payout details"
            detail={
              student.phone || student.mobileMoneyNumber
                ? "Saved — keep them current on your profile."
                : "Missing — add them on your profile page."
            }
          />
          <Step
            done={student.documents.length > 0}
            title="Documents submitted"
            detail={`${student.documents.length} uploaded · ${verifiedDocs} verified`}
          />
          <Step
            done={student.academicRecords.length > 0}
            title="Academic records"
            detail={
              student.academicRecords.length > 0
                ? `Latest term: ${student.academicRecords[0].term}`
                : "No records posted yet."
            }
          />
          <Step
            done={student.payments.length > 0}
            title="First disbursement"
            detail={
              student.payments.length > 0
                ? `${student.payments.length} payment(s) received`
                : "No disbursements yet."
            }
          />
        </ul>
      </Card>

      <Card title={`Disbursement history (${student.payments.length})`}>
        {student.payments.length === 0 ? (
          <p className="text-sm text-zinc-600">No scholarship payments received yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {student.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              >
                <span className="font-medium">{p.type}</span>
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                <span className="ml-auto text-zinc-500">
                  {p.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-sm">
        <Link href="/student/profile" className="font-medium underline">
          Update your profile →
        </Link>{" "}
        <Link href="/literacy" className="ml-3 font-medium underline">
          Financial literacy lessons →
        </Link>
      </p>
    </main>
  );
}
