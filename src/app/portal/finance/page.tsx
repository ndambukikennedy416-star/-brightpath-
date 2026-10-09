import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePortalRole } from "@/lib/portal/server";
import { initiatePayment, retryNotification, reviewPortalPayment } from "@/lib/portal/finance-actions";
import ActionForm from "@/components/ActionForm";
import { Badge } from "@/components/ui";
import type { PortalAccount, PortalNotification, PortalPayment, PortalProfile } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const btnGhostCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50";

const LEDGER_PAGE = 20;
const STATUSES = ["pending", "approved", "paid", "rejected"] as const;
const TYPES = ["TUITION", "RENT", "STIPEND", "EMERGENCY"] as const;

// Stored status -> ledger label. Labels only; stored values never change.
function ledgerStatus(status: string): { label: string; tone: "zinc" | "green" | "red" } {
  if (status === "paid") return { label: "Completed", tone: "green" };
  if (status === "rejected") return { label: "Failed", tone: "red" };
  return { label: "Processing", tone: "zinc" };
}

function maskAccount(n: string | null): string {
  if (!n) return "none";
  return n.length > 4 ? `.... ${n.slice(-4)}` : "....";
}

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function FinancePortalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePortalRole("financial_officer");
  if (!ctx) redirect("/portal-login");
  const { supabase, profile } = ctx;
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

  const q = str(sp.q).trim();
  const tab = str(sp.tab) === "landlords" ? "landlords" : "schools";
  const fStatus = STATUSES.includes(str(sp.fstatus) as (typeof STATUSES)[number])
    ? str(sp.fstatus)
    : "all";
  const fType = TYPES.includes(str(sp.ftype) as (typeof TYPES)[number])
    ? str(sp.ftype)
    : "all";
  const fFrom = str(sp.ffrom);
  const fTo = str(sp.fto);
  const page = Math.max(1, parseInt(str(sp.p) || "1", 10) || 1);

  // Workspace student list: search or first 30. Name + school + status only.
  let studentQuery = supabase
    .from("profiles")
    .select("id,full_name,email,school")
    .eq("role", "student")
    .order("full_name")
    .limit(30);
  if (q) {
    studentQuery = supabase
      .from("profiles")
      .select("id,full_name,email,school")
      .eq("role", "student")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .order("full_name")
      .limit(30);
  }

  let ledgerQuery = supabase
    .from("payments")
    .select(
      "id,amount,type,status,created_at,student_id,disbursement_date,payment_method,transaction_reference,approved_by",
      { count: "exact" }
    );
  if (fStatus !== "all") ledgerQuery = ledgerQuery.eq("status", fStatus);
  if (fType !== "all") ledgerQuery = ledgerQuery.eq("type", fType);
  if (fFrom) ledgerQuery = ledgerQuery.gte("created_at", fFrom);
  if (fTo) ledgerQuery = ledgerQuery.lt("created_at", `${fTo}T00:00:00Z`);
  ledgerQuery = ledgerQuery
    .order("created_at", { ascending: false })
    .range((page - 1) * LEDGER_PAGE, page * LEDGER_PAGE - 1);

  const [
    studentsRes,
    queueRes,
    ledgerRes,
    accountsRes,
    studentsAllRes,
    failuresRes,
  ] = await Promise.all([
    studentQuery,
    supabase.from("payments").select("id,amount,type,status,created_at,student_id").in("status", ["pending", "approved"]).order("created_at", { ascending: false }).limit(100),
    ledgerQuery,
    supabase.from("accounts").select("id,name,kind,student_id,bank_name,account_name,account_number,paybill_number,verified").order("name").limit(500),
    supabase.from("profiles").select("id,full_name,email").eq("role", "student").order("full_name").limit(500),
    supabase.from("notification_log").select("id,template,payment_id,document_id,recipient_email,status,error,attempts,created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(50),
  ]);

  const workspaceStudents = (studentsRes.data ?? []) as PortalProfile[];
  const queue = (queueRes.data ?? []) as PortalPayment[];
  const ledger = (ledgerRes.data ?? []) as PortalPayment[];
  const ledgerCount = ledgerRes.count ?? 0;
  const ledgerPages = Math.max(1, Math.ceil(ledgerCount / LEDGER_PAGE));
  const accounts = (accountsRes.data ?? []) as PortalAccount[];
  const studentName = new Map(
    ((studentsAllRes.data ?? []) as PortalProfile[]).map((s) => [s.id, s.full_name || s.email])
  );
  const failures = (failuresRes.data ?? []) as PortalNotification[];

  // Per-student pending indicators for the workspace list.
  const pendingByStudent = new Map<string, string[]>();
  for (const p of queue) {
    const list = pendingByStudent.get(p.student_id) ?? [];
    list.push(`${p.type}: ${p.status}`);
    pendingByStudent.set(p.student_id, list);
  }

  const baseParams = {
    q: q || undefined,
    tab,
    fstatus: fStatus === "all" ? undefined : fStatus,
    ftype: fType === "all" ? undefined : fType,
    ffrom: fFrom || undefined,
    fto: fTo || undefined,
  };

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Financial Officer
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          {profile.full_name || profile.email}
        </h1>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">Payment initiation</h2>
        <form method="get" className="mb-3 flex gap-2 text-sm">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search students by name or ID"
            aria-label="Search students"
            className={inputCls}
          />
          <button type="submit" className={btnGhostCls}>Search</button>
        </form>
        {workspaceStudents.length === 0 ? (
          <p className="text-sm text-zinc-600">No students found.</p>
        ) : (
          <ul className="mb-4 space-y-1 text-sm">
            {workspaceStudents.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                <span className="font-medium">{s.full_name || s.email}</span>
                <span className="text-zinc-600">{s.school ?? "school not on file"}</span>
                <span className="ml-auto text-xs text-zinc-500">
                  {(pendingByStudent.get(s.id) ?? []).join(" · ") || "no pending items"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={async (_s, fd) => initiatePayment(fd)} submitLabel="Record payment" onSuccess="Payment recorded as pending.">
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <select name="studentId" required aria-label="Student" className={inputCls} defaultValue="">
              <option value="" disabled>Select student</option>
              {workspaceStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
            </select>
            <select name="type" required aria-label="Payment type" className={inputCls} defaultValue="TUITION">
              <option value="TUITION">School Fees</option>
              <option value="RENT">Landlord Rent</option>
              <option value="STIPEND">Stipend</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
            <input name="amount" type="number" step="0.01" min={0} required placeholder="Amount (KSh)" aria-label="Amount" className={inputCls} />
            <select name="paymentMethod" required aria-label="Payment method" className={inputCls} defaultValue="">
              <option value="" disabled>Method</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="mobile_money">Mobile money</option>
              <option value="check">Check</option>
            </select>
            <input name="transactionReference" required placeholder="Transaction reference" aria-label="Transaction reference" className={inputCls} />
            <select name="accountId" aria-label="Related account (optional)" className={inputCls} defaultValue="">
              <option value="">Account (optional)</option>
              <optgroup label="Schools">
                {accounts.filter((a) => a.kind === "school").map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </optgroup>
              <optgroup label="Landlords">
                {accounts.filter((a) => a.kind === "landlord").map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </ActionForm>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Disbursement workflow ({queue.length} awaiting action)
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-zinc-600">Queue clear.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-zinc-500">
                  <th className="px-2 py-2">Student</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-2 py-2">{studentName.get(p.student_id) ?? "unknown"}</td>
                    <td className="px-2 py-2">{p.type}</td>
                    <td className="px-2 py-2 tabular-nums">
                      KSh {Number(p.amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={p.status === "approved" ? "green" : "amber"}>{p.status}</Badge>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {p.status === "pending" && (
                          <ActionForm action={async (_s, fd) => reviewPortalPayment(fd)} submitLabel="Approve" onSuccess="Approved.">
                            <input type="hidden" name="paymentId" value={p.id} />
                            <input type="hidden" name="status" value="approved" />
                          </ActionForm>
                        )}
                        <ActionForm action={async (_s, fd) => reviewPortalPayment(fd)} submitLabel="Mark paid" onSuccess="Marked paid. Receipt email queued.">
                          <input type="hidden" name="paymentId" value={p.id} />
                          <input type="hidden" name="status" value="paid" />
                        </ActionForm>
                        <ActionForm action={async (_s, fd) => reviewPortalPayment(fd)} submitLabel="Reject" onSuccess="Rejected.">
                          <input type="hidden" name="paymentId" value={p.id} />
                          <input type="hidden" name="status" value="rejected" />
                        </ActionForm>
                        {p.status === "paid" && (
                          <a href={`/api/portal-receipts/${p.id}`} className={btnGhostCls}>
                            Receipt
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Disbursement ledger ({ledgerCount})
        </h2>
        <form method="get" className="mb-3 grid gap-2 text-sm md:grid-cols-5">
          <input type="hidden" name="tab" value={tab} />
          {q && <input type="hidden" name="q" value={q} />}
          <select name="fstatus" aria-label="Filter by status" className={inputCls} defaultValue={fStatus}>
            <option value="all">All statuses</option>
            <option value="pending">Processing</option>
            <option value="approved">Approved</option>
            <option value="paid">Completed</option>
            <option value="rejected">Failed</option>
          </select>
          <select name="ftype" aria-label="Filter by type" className={inputCls} defaultValue={fType}>
            <option value="all">All types</option>
            <option value="TUITION">School Fees</option>
            <option value="RENT">Landlord Rent</option>
            <option value="STIPEND">Stipend</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
          <input name="ffrom" type="date" aria-label="From date" defaultValue={fFrom} className={inputCls} />
          <input name="fto" type="date" aria-label="To date" defaultValue={fTo} className={inputCls} />
          <button type="submit" className={btnGhostCls}>Filter</button>
        </form>
        {ledger.length === 0 ? (
          <p className="text-sm text-zinc-600">No records match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-zinc-500">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Student</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((p) => {
                  const s = ledgerStatus(p.status);
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-2 py-2 tabular-nums">
                        {new Date(p.disbursement_date ?? p.created_at).toLocaleDateString("en-KE")}
                      </td>
                      <td className="px-2 py-2">{studentName.get(p.student_id) ?? "unknown"}</td>
                      <td className="px-2 py-2">{p.type}</td>
                      <td className="px-2 py-2 tabular-nums">
                        KSh {Number(p.amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </td>
                      <td className="px-2 py-2 tabular-nums">{p.transaction_reference ?? "none"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-sm">
          {page > 1 ? (
            <Link href={`/portal/finance${qs({ ...baseParams, p: String(page - 1) })}`} className={btnGhostCls}>
              Prev
            </Link>
          ) : (
            <span className={`${btnGhostCls} opacity-50`}>Prev</span>
          )}
          <span className="text-zinc-600 tabular-nums">
            Page {page} of {ledgerPages}
          </span>
          {page < ledgerPages ? (
            <Link href={`/portal/finance${qs({ ...baseParams, p: String(page + 1) })}`} className={btnGhostCls}>
              Next
            </Link>
          ) : (
            <span className={`${btnGhostCls} opacity-50`}>Next</span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">Account directory</h2>
        <div className="mb-3 flex gap-2 text-sm">
          <Link
            href={`/portal/finance${qs({ ...baseParams, p: undefined, tab: "schools" })}`}
            className={tab === "schools" ? "rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white" : btnGhostCls}
          >
            School Accounts
          </Link>
          <Link
            href={`/portal/finance${qs({ ...baseParams, p: undefined, tab: "landlords" })}`}
            className={tab === "landlords" ? "rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white" : btnGhostCls}
          >
            Landlord Accounts
          </Link>
        </div>
        {(() => {
          const rows = accounts.filter((a) => (tab === "schools" ? a.kind === "school" : a.kind === "landlord"));
          if (rows.length === 0) return <p className="text-sm text-zinc-600">No accounts in this tab.</p>;
          return (
            <ul className="space-y-1 text-sm">
              {rows.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-zinc-600">{a.bank_name ?? a.paybill_number ?? "no provider on file"}</span>
                  <span className="tabular-nums text-zinc-600">{maskAccount(a.account_number)}</span>
                  <span className="ml-auto text-zinc-600">
                    {a.kind === "school"
                      ? a.name
                      : (a.student_id && studentName.get(a.student_id)) || "no linked student"}
                  </span>
                </li>
              ))}
            </ul>
          );
        })()}
        <p className="mt-2 text-xs text-zinc-500">
          Read only. Account changes are made by administrators.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Error log ({failures.length})
        </h2>
        {failures.length === 0 ? (
          <p className="text-sm text-zinc-600">No failed email deliveries.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {failures.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                <span className="font-medium">{f.template}</span>
                <span className="text-zinc-600">{f.recipient_email ?? "no recipient stored"}</span>
                <span className="text-red-700">{f.error ?? "unknown error"}</span>
                <span className="text-xs tabular-nums text-zinc-500">
                  {new Date(f.created_at).toLocaleString("en-KE")} · tries: {f.attempts}
                </span>
                <span className="ml-auto">
                  <ActionForm action={async (_s, fd) => retryNotification(fd)} submitLabel="Retry" onSuccess="Retried.">
                    <input type="hidden" name="notificationId" value={f.id} />
                  </ActionForm>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
