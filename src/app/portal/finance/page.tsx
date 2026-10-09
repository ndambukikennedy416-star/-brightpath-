import { redirect } from "next/navigation";
import { requirePortalRole } from "@/lib/portal/server";
import { initiatePayment, reviewPortalPayment, saveAccount, verifyAccount } from "@/lib/portal/finance-actions";
import ActionForm from "@/components/ActionForm";
import { Badge } from "@/components/ui";
import type { PortalAccount, PortalPayment, PortalProfile } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const btnGhostCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50";

function tone(status: string): "zinc" | "green" | "red" | "amber" {
  if (status === "paid" || status === "approved") return "green";
  if (status === "rejected") return "red";
  return "amber";
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  mobile_money: "Mobile money",
  check: "Check",
};

export default async function FinancePortalPage() {
  const ctx = await requirePortalRole("financial_officer");
  if (!ctx) redirect("/portal-login");
  const { supabase, profile } = ctx;

  const [paymentsRes, accountsRes, studentsRes, docsRes, officersRes] = await Promise.all([
    supabase.from("payments").select("id,amount,type,status,created_at,student_id,disbursement_date,payment_method,transaction_reference,approved_by").order("created_at", { ascending: false }).limit(100),
    supabase.from("accounts").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,full_name,email").eq("role", "student").order("full_name"),
    supabase.from("student_documents").select("id").eq("status", "pending"),
    supabase.from("profiles").select("id,full_name,email").in("role", ["financial_officer", "admin"]),
  ]);
  const payments = (paymentsRes.data ?? []) as PortalPayment[];
  const accounts = (accountsRes.data ?? []) as PortalAccount[];
  const students = (studentsRes.data ?? []) as PortalProfile[];
  const pendingDocs = docsRes.data?.length ?? 0;
  const officerName = new Map(
    (((officersRes.data ?? []) as PortalProfile[])).map((o) => [o.id, o.full_name || o.email])
  );
  const disbursed = payments.filter((p) => p.status === "paid").slice(0, 15);

  const paidTotal = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pending = payments.filter((p) => p.status === "pending" || p.status === "approved");
  const studentName = new Map(students.map((s) => [s.id, s.full_name || s.email]));

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total paid out", `KSh ${paidTotal.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`],
          ["Pending payments", String(pending.length)],
          ["Payment accounts", String(accounts.length)],
          ["Documents to verify", String(pendingDocs)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-2xl font-bold tabular-nums text-zinc-900">{value}</div>
            <div className="text-sm text-zinc-600">{label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">Initiate payment</h2>
        <ActionForm action={async (_s, fd) => initiatePayment(fd)} submitLabel="Record payment" onSuccess="Payment recorded as pending.">
          <div className="grid gap-2 text-sm md:grid-cols-4">
            <select name="studentId" required aria-label="Student" className={inputCls} defaultValue="">
              <option value="" disabled>Select student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
            </select>
            <input name="amount" type="number" step="0.01" min={0} required placeholder="Amount (KSh)" aria-label="Amount" className={inputCls} />
            <select name="type" required aria-label="Type" className={inputCls} defaultValue="TUITION">
              <option value="TUITION">Tuition</option>
              <option value="RENT">Rent</option>
              <option value="STIPEND">Stipend</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
        </ActionForm>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Disbursement workflow ({pending.length} awaiting action)
        </h2>
        {pending.length === 0 ? (
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
                {pending.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-2 py-2">{studentName.get(p.student_id) ?? "—"}</td>
                    <td className="px-2 py-2">{p.type}</td>
                    <td className="px-2 py-2 tabular-nums">
                      KSh {Number(p.amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={tone(p.status)}>{p.status}</Badge>
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
                          <div className="grid gap-1">
                            <select name="paymentMethod" required aria-label="Payment method" className={inputCls} defaultValue="">
                              <option value="" disabled>Method…</option>
                              <option value="bank_transfer">Bank transfer</option>
                              <option value="mobile_money">Mobile money</option>
                              <option value="check">Check</option>
                            </select>
                            <input name="transactionReference" required placeholder="Reference" aria-label="Transaction reference" className={inputCls} />
                          </div>
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
          Recent disbursements ({disbursed.length})
        </h2>
        {disbursed.length === 0 ? (
          <p className="text-sm text-zinc-600">Nothing disbursed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-zinc-500">
                  <th className="px-2 py-2">Student</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Method</th>
                  <th className="px-2 py-2">Reference</th>
                  <th className="px-2 py-2">Paid on</th>
                  <th className="px-2 py-2">Approved by</th>
                </tr>
              </thead>
              <tbody>
                {disbursed.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-2 py-2">{studentName.get(p.student_id) ?? "—"}</td>
                    <td className="px-2 py-2">{p.type}</td>
                    <td className="px-2 py-2 tabular-nums">
                      KSh {Number(p.amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2">{p.payment_method ? (METHOD_LABELS[p.payment_method] ?? p.payment_method) : "—"}</td>
                    <td className="px-2 py-2 tabular-nums">{p.transaction_reference ?? "—"}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {p.disbursement_date ? new Date(p.disbursement_date).toLocaleDateString("en-KE") : "—"}
                    </td>
                    <td className="px-2 py-2">{(p.approved_by && officerName.get(p.approved_by)) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Payment accounts ({accounts.length})
        </h2>
        <ActionForm action={async (_s, fd) => saveAccount(fd)} submitLabel="Add account" onSuccess="Account saved.">
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <input name="name" required minLength={2} placeholder="School / landlord name" aria-label="Name" className={inputCls} />
            <select name="kind" required aria-label="Account type" className={inputCls} defaultValue="school">
              <option value="school">School</option>
              <option value="landlord">Landlord</option>
            </select>
            <input name="contactPerson" placeholder="Contact person" aria-label="Contact person" className={inputCls} />
            <input name="contactPhone" placeholder="Contact phone" aria-label="Contact phone" className={inputCls} />
            <input name="bankName" placeholder="Bank" aria-label="Bank" className={inputCls} />
            <input name="accountName" placeholder="Account name (as on statement)" aria-label="Account name" className={inputCls} />
            <input name="accountNumber" placeholder="Account number" aria-label="Account number" className={inputCls} />
            <input name="paybillNumber" placeholder="M-PESA PayBill" aria-label="PayBill" className={inputCls} />
          </div>
        </ActionForm>
        <ul className="mt-3 space-y-1 text-sm">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <span className="font-medium">{a.name}</span>
              <Badge>{a.kind}</Badge>
              {a.verified ? <Badge tone="green">VERIFIED</Badge> : <Badge tone="amber">PENDING</Badge>}
              <span className="text-zinc-600">{a.contact_phone ?? "no contact"}</span>
              <div className="ml-auto">
                <ActionForm action={async (_s, fd) => verifyAccount(fd)} submitLabel={a.verified ? "Unverify" : "Verify"} onSuccess="Saved.">
                  <input type="hidden" name="accountId" value={a.id} />
                  <input type="hidden" name="verified" value={a.verified ? "false" : "true"} />
                </ActionForm>
              </div>
            </li>
          ))}
          {accounts.length === 0 && <li className="text-zinc-600">No accounts yet.</li>}
        </ul>
      </section>
    </main>
  );
}
