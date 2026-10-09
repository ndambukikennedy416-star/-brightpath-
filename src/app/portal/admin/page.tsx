import { redirect } from "next/navigation";
import { requirePortalRole } from "@/lib/portal/server";
import { saveAccount, verifyAccount } from "@/lib/portal/finance-actions";
import ActionForm from "@/components/ActionForm";
import { Badge } from "@/components/ui";
import type { PortalAccount, PortalProfile } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";

export default async function AdminPortalPage() {
  const ctx = await requirePortalRole("admin");
  if (!ctx) redirect("/portal-login");
  const { supabase, profile } = ctx;

  const [users, payments, docs, accountsCount, resources, applications, pendingVerification, monthPaid, students, accounts] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("amount").eq("status", "paid"),
    supabase.from("student_documents").select("id", { count: "exact", head: true }),
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("financial_literacy_resources").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("student_documents").select("id", { count: "exact", head: true }).eq("verified", false),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "paid").gte("disbursement_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from("profiles").select("id,full_name,email").eq("role", "student").order("full_name").limit(500),
    supabase.from("accounts").select("id,name,kind,student_id,bank_name,account_name,account_number,paybill_number,verified").order("name").limit(500),
  ]);
  const studentList = ((students.data ?? []) as PortalProfile[]);
  const accountList = ((accounts.data ?? []) as PortalAccount[]);
  const studentName = new Map(studentList.map((s) => [s.id, s.full_name || s.email]));

  const paid = ((payments.data ?? []) as Array<{ amount: number | string }>)
    .reduce((s, p) => s + Number(p.amount), 0);

  const cards: Array<[string, string, string]> = [
    ["Portal users", String(users.count ?? 0), "All roles"],
    ["Payments paid", String((payments.data ?? []).length), `Paid out KSh ${paid.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`],
    ["Documents", String(docs.count ?? 0), "Student uploads"],
    ["Payment accounts", String(accountsCount.count ?? 0), "Schools and landlords"],
    ["Literacy resources", String(resources.count ?? 0), "M&E library"],
    ["Applications received", String(applications.count ?? 0), "Student profiles"],
    ["Pending verification", String(pendingVerification.count ?? 0), "Documents awaiting review"],
    ["Paid this month", String(monthPaid.count ?? 0), "Disbursements"],
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Administrator
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          {profile.full_name || profile.email}
        </h1>
        <p className="text-sm text-zinc-600">
          System overview. Payment processing is handled by Finance Officers.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-2xl font-bold tabular-nums text-zinc-900">{value}</div>
            <div className="text-sm font-medium text-zinc-700">{label}</div>
            <div className="text-xs text-zinc-500">{hint}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-zinc-600">
        Detailed queues live in the Finance and M&amp;E sections, which are
        restricted to those roles.
      </p>
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Payment accounts ({accountList.length})
        </h2>
        <ActionForm action={async (_s, fd) => saveAccount(fd)} submitLabel="Add account" onSuccess="Account saved.">
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <input name="name" required minLength={2} placeholder="School / landlord name" aria-label="Name" className={inputCls} />
            <select name="kind" required aria-label="Account type" className={inputCls} defaultValue="school">
              <option value="school">School</option>
              <option value="landlord">Landlord</option>
            </select>
            <select name="studentId" aria-label="Linked student (optional)" className={inputCls} defaultValue="">
              <option value="">No linked student</option>
              {studentList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
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
          {accountList.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <span className="font-medium">{a.name}</span>
              <Badge>{a.kind}</Badge>
              {a.verified ? <Badge tone="green">VERIFIED</Badge> : <Badge tone="amber">PENDING</Badge>}
              <span className="text-zinc-600">
                {(a.student_id && studentName.get(a.student_id)) || "no linked student"}
              </span>
              <div className="ml-auto">
                <ActionForm action={async (_s, fd) => verifyAccount(fd)} submitLabel={a.verified ? "Unverify" : "Verify"} onSuccess="Saved.">
                  <input type="hidden" name="accountId" value={a.id} />
                  <input type="hidden" name="verified" value={a.verified ? "false" : "true"} />
                </ActionForm>
              </div>
            </li>
          ))}
          {accountList.length === 0 && <li className="text-zinc-600">No accounts yet.</li>}
        </ul>
      </section>
    </main>
  );
}
