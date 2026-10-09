import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const FINANCE_ACTIONS = [
  "PAYMENT.",
  "INVOICE.",
  "CLAIM.",
  "FEE_STRUCTURE.",
  "LEASE.",
  "RECIPIENT.",
  "DOCUMENT.",
];

// Finance-scoped audit trail: finance actions only (user management lives in /audit).
export default async function FinanceAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER"].includes(session.user.role)) redirect("/dashboard");
  const params = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: FINANCE_ACTIONS.map((prefix) => ({
        action: { startsWith: prefix },
      })),
      ...(params.q
        ? {
            AND: [
              {
                OR: [
                  { action: { contains: params.q, mode: "insensitive" as const } },
                  { entity: { contains: params.q, mode: "insensitive" as const } },
                  { entityId: { contains: params.q } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const actors = await prisma.user.findMany({
    where: { id: { in: logs.map((l) => l.actorId).filter((x): x is string => !!x) } },
    select: { id: true, email: true },
  });
  const actorEmail = new Map(actors.map((a) => [a.id, a.email]));

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Finance audit trail</h1>
      <form method="get" className="flex gap-2 text-sm">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Filter by action, entity, id…"
          className="max-w-md flex-1 rounded-lg border px-3 py-2"
        />
        <button type="submit" className="rounded-full border px-4 py-2">Filter</button>
      </form>
      <Card>
        <ul className="space-y-1 font-mono text-xs">
          {logs.map((l) => (
            <li key={l.id} className="rounded border px-3 py-2">
              <span className="text-zinc-500">{l.createdAt.toLocaleString()}</span>{" "}
              <strong>{l.action}</strong> {l.entity}
              {l.entityId && <span className="text-zinc-600"> #{l.entityId.slice(0, 8)}</span>}{" "}
              {l.actorId && <span>by {actorEmail.get(l.actorId) ?? l.actorId.slice(0, 8)}</span>}
              {l.ipAddress && <span className="text-zinc-600"> · {l.ipAddress}</span>}
              {l.metadata && <div className="text-zinc-600">{l.metadata}</div>}
            </li>
          ))}
          {logs.length === 0 && <li>No finance audit entries.</li>}
        </ul>
      </Card>
    </main>
  );
}
