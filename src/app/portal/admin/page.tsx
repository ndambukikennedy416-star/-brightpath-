import { redirect } from "next/navigation";
import { requirePortalRole } from "@/lib/portal/server";
import type { PortalPayment } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

export default async function AdminPortalPage() {
  const ctx = await requirePortalRole("admin");
  if (!ctx) redirect("/portal-login");
  const { supabase, profile } = ctx;

  const [users, payments, docs, accounts, resources] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("id,amount,status"),
    supabase.from("student_documents").select("id", { count: "exact", head: true }),
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("financial_literacy_resources").select("id", { count: "exact", head: true }),
  ]);

  const paid = ((payments.data ?? []) as PortalPayment[])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);

  const cards: Array<[string, string, string]> = [
    ["Portal users", String(users.count ?? 0), "All roles"],
    ["Payments recorded", String((payments.data ?? []).length), `Paid out KSh ${paid.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`],
    ["Documents", String(docs.count ?? 0), "Student uploads"],
    ["Payment accounts", String(accounts.count ?? 0), "Schools and landlords"],
    ["Literacy resources", String(resources.count ?? 0), "M&E library"],
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
    </main>
  );
}
