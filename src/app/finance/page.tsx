import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePaymentStatus } from "@/lib/actions/payments";
import { reviewClaim } from "@/lib/actions/claims";
import { reviewInvoice } from "@/lib/actions/invoices";
import { verifyDocument, rejectDocument } from "@/lib/actions/documents";
import { Badge, Card, btnGhostCls, statusTone } from "@/components/ui";
import { kes } from "@/lib/format";
import { getBudgetTotals } from "@/lib/cached";
import SubmitForm from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function pageOf(value: string | string[] | undefined): number {
  const n = parseInt(Array.isArray(value) ? value[0] : (value ?? "1"), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 1;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ pp?: string; ip?: string; cp?: string; dp?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER"].includes(session.user.role)) redirect("/dashboard");
  const params = await searchParams;
  const pp = pageOf(params.pp);
  const ip = pageOf(params.ip);
  const cp = pageOf(params.cp);
  const dp = pageOf(params.dp);

  const hrefFor = (over: { pp?: number; ip?: number; cp?: number; dp?: number }) => {
    const q = new URLSearchParams({
      pp: String(over.pp ?? pp),
      ip: String(over.ip ?? ip),
      cp: String(over.cp ?? cp),
      dp: String(over.dp ?? dp),
    });
    // Drop page=1 params to keep URLs short.
    for (const [k, v] of [...q.entries()]) if (v === "1") q.delete(k);
    const s = q.toString();
    return s ? `/finance?${s}` : "/finance";
  };

  // Per-queue pagination: previously each queue was an unbounded (now
  // take:100) full scan. Pages of 25 with a +1 lookahead keep payloads small
  // while Next/Prev links preserve the other queues' positions.
  const [paymentsPlus, invoicesPlus, claimsPlus, docsPlus, totals] = await Promise.all([
    prisma.payment.findMany({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      select: {
        id: true,
        studentId: true,
        type: true,
        amount: true,
        status: true,
        student: { select: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      skip: (pp - 1) * PAGE_SIZE,
    }),
    prisma.invoice.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        studentId: true,
        type: true,
        amount: true,
        documentUrl: true,
        student: { select: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      skip: (ip - 1) * PAGE_SIZE,
    }),
    prisma.expenseClaim.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        studentId: true,
        amount: true,
        description: true,
        receiptUrl: true,
        isEmergency: true,
        student: { select: { user: { select: { name: true } } } },
      },
      orderBy: [{ isEmergency: "desc" }, { createdAt: "asc" }],
      take: PAGE_SIZE + 1,
      skip: (cp - 1) * PAGE_SIZE,
    }),
    prisma.document.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        studentId: true,
        type: true,
        fileUrl: true,
        student: { select: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
      take: PAGE_SIZE + 1,
      skip: (dp - 1) * PAGE_SIZE,
    }),
    // Shared with Nav + dashboard via React.cache + unstable_cache.
    getBudgetTotals(),
  ]);

  const hasMoreP = paymentsPlus.length > PAGE_SIZE;
  const hasMoreI = invoicesPlus.length > PAGE_SIZE;
  const hasMoreC = claimsPlus.length > PAGE_SIZE;
  const hasMoreD = docsPlus.length > PAGE_SIZE;
  const payments = hasMoreP ? paymentsPlus.slice(0, PAGE_SIZE) : paymentsPlus;
  const invoices = hasMoreI ? invoicesPlus.slice(0, PAGE_SIZE) : invoicesPlus;
  const claims = hasMoreC ? claimsPlus.slice(0, PAGE_SIZE) : claimsPlus;
  const docs = hasMoreD ? docsPlus.slice(0, PAGE_SIZE) : docsPlus;

  const totalDisbursed = totals.disbursed;
  const totalBudget = totals.budget;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Finance review</h1>
        <Link href="/finance/recipients" className="ml-auto rounded-full border px-4 py-2 text-sm">
          Payment recipients
        </Link>
        <Link href="/finance/fees" className="rounded-full border px-4 py-2 text-sm">
          Fee structures
        </Link>
        <Link href="/finance/audit" className="rounded-full border px-4 py-2 text-sm">
          Audit trail
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold tabular-nums">{kes(totalBudget)}</div>
          <div className="text-sm text-zinc-600">Total budget</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold tabular-nums">{kes(totalDisbursed)}</div>
          <div className="text-sm text-zinc-600">Disbursed</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold tabular-nums">{payments.length + claims.length}</div>
          <div className="text-sm text-zinc-600">Pending payments</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xl font-bold tabular-nums">{docs.length + invoices.length}</div>
          <div className="text-sm text-zinc-600">Verification queue</div>
        </div>
      </div>

      <Card title={`Payments queue (page ${pp})`}>
        <ul className="space-y-1 text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <Link href={`/students/${p.studentId}`} className="font-medium underline">
                {p.student.user.name}
              </Link>
              <span>{p.type} · {kes(p.amount)}</span>
              <Badge tone={statusTone(p.status)}>{p.status}</Badge>
              {p.type === "STIPEND" && <span className="text-xs text-zinc-500">(literacy-gated)</span>}
              <SubmitForm action={updatePaymentStatus} className="ml-auto flex gap-1">
                <input type="hidden" name="paymentId" value={p.id} />
                {p.status === "PENDING" && (
                  <button type="submit" name="status" value="APPROVED" className={btnGhostCls}>Approve</button>
                )}
                <button type="submit" name="status" value="DISBURSED" className={btnGhostCls}>Disburse</button>
                <button type="submit" name="status" value="REJECTED" className={btnGhostCls}>Reject</button>
              </SubmitForm>
            </li>
          ))}
          {payments.length === 0 && <li>Queue clear.</li>}
        </ul>
        <div className="mt-3 flex gap-2 text-sm">
          {pp > 1 && <Link href={hrefFor({ pp: pp - 1 })} className="rounded-full border px-4 py-1.5">← Prev</Link>}
          {hasMoreP && <Link href={hrefFor({ pp: pp + 1 })} className="rounded-full border px-4 py-1.5">Next →</Link>}
        </div>
      </Card>

      <Card title={`Invoices queue (page ${ip})`}>
        <ul className="space-y-1 text-sm">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <Link href={`/students/${inv.studentId}`} className="font-medium underline">
                {inv.student.user.name}
              </Link>
              <span>{inv.type} · {kes(inv.amount)}</span>
              <a href={inv.documentUrl} target="_blank" rel="noreferrer" className="underline">doc</a>
              <SubmitForm action={reviewInvoice} className="ml-auto flex gap-1">
                <input type="hidden" name="invoiceId" value={inv.id} />
                <button type="submit" name="status" value="APPROVED" className={btnGhostCls}>Approve</button>
                <button type="submit" name="status" value="REJECTED" className={btnGhostCls}>Reject</button>
              </SubmitForm>
            </li>
          ))}
          {invoices.length === 0 && <li>Queue clear.</li>}
        </ul>
        <div className="mt-3 flex gap-2 text-sm">
          {ip > 1 && <Link href={hrefFor({ ip: ip - 1 })} className="rounded-full border px-4 py-1.5">← Prev</Link>}
          {hasMoreI && <Link href={hrefFor({ ip: ip + 1 })} className="rounded-full border px-4 py-1.5">Next →</Link>}
        </div>
      </Card>

      <Card title={`Expense claims (page ${cp}) — emergencies first`}>
        <ul className="space-y-1 text-sm">
          {claims.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <Link href={`/students/${c.studentId}`} className="font-medium underline">
                {c.student.user.name}
              </Link>
              <span>{kes(c.amount)} · {c.description}</span>
              {c.isEmergency && <Badge tone="red">EMERGENCY</Badge>}
              <a href={c.receiptUrl} target="_blank" rel="noreferrer" className="underline">receipt</a>
              <SubmitForm action={reviewClaim} className="ml-auto flex gap-1">
                <input type="hidden" name="claimId" value={c.id} />
                <button type="submit" name="status" value="APPROVED" className={btnGhostCls}>Approve</button>
                <button type="submit" name="status" value="REJECTED" className={btnGhostCls}>Reject</button>
              </SubmitForm>
            </li>
          ))}
          {claims.length === 0 && <li>Queue clear.</li>}
        </ul>
        <div className="mt-3 flex gap-2 text-sm">
          {cp > 1 && <Link href={hrefFor({ cp: cp - 1 })} className="rounded-full border px-4 py-1.5">← Prev</Link>}
          {hasMoreC && <Link href={hrefFor({ cp: cp + 1 })} className="rounded-full border px-4 py-1.5">Next →</Link>}
        </div>
      </Card>

      <Card title={`Unverified documents (page ${dp})`}>
        <ul className="space-y-1 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <Link href={`/students/${d.studentId}`} className="font-medium underline">
                {d.student.user.name}
              </Link>
              <span>{d.type}</span>
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className="underline">view</a>
              <SubmitForm action={verifyDocument} className="ml-auto flex gap-1">
                <input type="hidden" name="documentId" value={d.id} />
                <button type="submit" className={btnGhostCls}>Verify</button>
              </SubmitForm>
              <SubmitForm action={rejectDocument} className="flex gap-1">
                <input type="hidden" name="documentId" value={d.id} />
                <button type="submit" className={btnGhostCls}>Reject</button>
              </SubmitForm>
            </li>
          ))}
          {docs.length === 0 && <li>All verified.</li>}
        </ul>
        <div className="mt-3 flex gap-2 text-sm">
          {dp > 1 && <Link href={hrefFor({ dp: dp - 1 })} className="rounded-full border px-4 py-1.5">← Prev</Link>}
          {hasMoreD && <Link href={hrefFor({ dp: dp + 1 })} className="rounded-full border px-4 py-1.5">Next →</Link>}
        </div>
      </Card>
    </main>
  );
}
