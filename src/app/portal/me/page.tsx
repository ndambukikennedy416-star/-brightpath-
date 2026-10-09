import { redirect } from "next/navigation";
import { requirePortalRole } from "@/lib/portal/server";
import { deleteResource, saveResource } from "@/lib/portal/me-actions";
import ActionForm from "@/components/ActionForm";
import { Badge } from "@/components/ui";
import type { PortalPayment, PortalProfile, PortalResource } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";

export default async function MePortalPage() {
  const ctx = await requirePortalRole("monitor_evaluator");
  if (!ctx) redirect("/portal-login");
  const { supabase, profile } = ctx;

  const [paymentsRes, resourcesRes, studentsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id,amount,type,status,created_at,student_id")
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("financial_literacy_resources")
      .select("id,title,body,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id,full_name,email").eq("role", "student").limit(500),
  ]);
  const payments = (paymentsRes.data ?? []) as PortalPayment[];
  const resources = (resourcesRes.data ?? []) as PortalResource[];
  const studentName = new Map(
    ((studentsRes.data ?? []) as PortalProfile[]).map((s) => [s.id, s.full_name || s.email])
  );

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Monitor &amp; Evaluator
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          {profile.full_name || profile.email}
        </h1>
        <p className="text-sm text-zinc-600">
          Payments below show pending and paid records only.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Student payments ({payments.length})
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-600">No pending or paid payments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-zinc-500">
                  <th className="px-2 py-2">Student</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-2 py-2">{studentName.get(p.student_id) ?? "—"}</td>
                    <td className="px-2 py-2">{p.type}</td>
                    <td className="px-2 py-2 tabular-nums">
                      KSh {Number(p.amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={p.status === "paid" ? "green" : "amber"}>{p.status}</Badge>
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
          Financial literacy resources ({resources.length})
        </h2>
        <ActionForm action={async (_s, fd) => saveResource(fd)} submitLabel="Publish resource" onSuccess="Resource published.">
          <div className="grid gap-2 text-sm">
            <input name="title" required minLength={3} placeholder="Title" aria-label="Title" className={inputCls} />
            <textarea name="body" required minLength={10} rows={3} placeholder="Lesson content" aria-label="Content" className={inputCls} />
          </div>
        </ActionForm>
        <ul className="mt-3 space-y-2 text-sm">
          {resources.map((r) => (
            <li key={r.id} className="rounded-lg border px-3 py-2">
              <p className="font-medium">{r.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-zinc-600">{r.body}</p>
              <ActionForm action={async (_s, fd) => deleteResource(fd)} submitLabel="Delete" onSuccess="Deleted.">
                <input type="hidden" name="resourceId" value={r.id} />
              </ActionForm>
            </li>
          ))}
          {resources.length === 0 && <li className="text-zinc-600">No resources yet.</li>}
        </ul>
      </section>
    </main>
  );
}
