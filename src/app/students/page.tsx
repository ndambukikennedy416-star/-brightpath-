import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, statusTone } from "@/components/ui";
import { kes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT"].includes(session.user.role)) {
    redirect("/dashboard");
  }
  const params = await searchParams;

  // Bounded page size: previously an unbounded findMany loaded every
  // beneficiary + all disbursed payments, then summed in JS.
  const PAGE_SIZE = 50;
  const students = await prisma.student.findMany({
    where: {
      status: (params.status as "ACTIVE" | "SUSPENDED" | "GRADUATED" | "WITHDRAWN" | undefined) || undefined,
      ...(params.q
        ? {
            OR: [
              { schoolName: { contains: params.q, mode: "insensitive" } },
              { user: { name: { contains: params.q, mode: "insensitive" } } },
              { user: { email: { contains: params.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      schoolName: true,
      currentYear: true,
      totalBudget: true,
      status: true,
      user: { select: { name: true, email: true } },
      payments: { where: { status: "DISBURSED" }, select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
  });
  const hasMore = students.length > PAGE_SIZE;
  const visible = hasMore ? students.slice(0, PAGE_SIZE) : students;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">Beneficiaries</h1>
        <span className="text-sm text-zinc-500">
          (showing {visible.length}{hasMore ? "+" : ""})
        </span>
        <div className="ml-auto flex gap-2 text-sm">
          <Link href="/students/new" className="rounded-full bg-black px-4 py-2 text-white">
            + New
          </Link>
          <Link href="/students/import" className="rounded-full border px-4 py-2">
            ⇪ Import
          </Link>
        </div>
      </div>

      <form method="get" className="flex flex-wrap gap-2 text-sm">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search name, email, school…"
          className="min-w-52 flex-1 rounded-lg border px-3 py-2"
        />
        <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border px-3 py-2">
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="GRADUATED">GRADUATED</option>
          <option value="WITHDRAWN">WITHDRAWN</option>
        </select>
        <button type="submit" className="rounded-full border px-4 py-2">Filter</button>
      </form>

      <ul className="space-y-2">
        {visible.map((s) => {
          const disbursed = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
          return (
            <li key={s.id} className="rounded-xl border bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/students/${s.id}`} className="font-medium underline">
                  {s.user.name}
                </Link>
                <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                <span className="ml-auto text-sm text-zinc-600">
                  {kes(disbursed)} / {kes(s.totalBudget)}
                </span>
              </div>
              <div className="text-sm text-zinc-600">
                {s.user.email} · {s.schoolName} · Year {s.currentYear}
              </div>
            </li>
          );
        })}
        {visible.length === 0 && <li className="text-sm text-zinc-600">No beneficiaries found.</li>}
        {hasMore && (
          <li className="text-sm text-zinc-600">
            Showing first {PAGE_SIZE} — refine search or status filter to narrow results.
          </li>
        )}
      </ul>
    </main>
  );
}
