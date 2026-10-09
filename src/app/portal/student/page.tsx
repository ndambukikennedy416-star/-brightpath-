import { redirect } from "next/navigation";
import { requirePortalRole } from "@/lib/portal/server";
import { Badge } from "@/components/ui";
import StudentUploadForm from "./_components/StudentUploadForm";
import ToastHost from "@/app/admin/users/_components/Toast";
import type { PortalDocument, PortalPayment } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

function tone(status: string): "zinc" | "green" | "red" | "amber" {
  if (status === "paid" || status === "approved" || status === "verified") return "green";
  if (status === "rejected") return "red";
  return "amber";
}

export default async function StudentPortalPage() {
  const ctx = await requirePortalRole("student");
  if (!ctx) redirect("/portal-login");
  const { supabase, profile } = ctx;

  const [paymentsRes, docsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id,type,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("student_documents")
      .select("id,type,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const payments = (paymentsRes.data ?? []) as PortalPayment[];
  const docs = (docsRes.data ?? []) as PortalDocument[];

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Student</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          {profile.full_name || profile.email}
        </h1>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">Payment status</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-600">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              >
                <span className="font-medium capitalize">{p.type.toLowerCase()}</span>
                <Badge tone={tone(p.status)}>{p.status}</Badge>
                <span className="ml-auto text-xs text-zinc-500">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          My documents ({docs.length})
        </h2>
        <StudentUploadForm />
        <ul className="mt-3 space-y-1 text-sm">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
            >
              <span className="font-medium">{d.type}</span>
              <Badge tone={tone(d.status)}>{d.status}</Badge>
              <span className="ml-auto text-xs text-zinc-500">
                {new Date(d.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
          {docs.length === 0 && <li className="text-zinc-600">Nothing uploaded yet.</li>}
        </ul>
      </section>
      <ToastHost />
    </main>
  );
}
