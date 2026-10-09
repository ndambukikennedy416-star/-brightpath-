import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitInvoice } from "@/lib/actions/invoices";
import UploadField from "@/components/UploadField";
import { Badge, Card, btnGhostCls, statusTone } from "@/components/ui";
import { kes } from "@/lib/format";
import SubmitForm from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

// Partner portal: schools/landlords see their invoices and submit new ones.
// Staff see all partners.
export default async function PartnersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role } = session.user;
  if (!["ADMIN", "FINANCE_OFFICER", "EXTERNAL_PARTNER"].includes(role)) {
    redirect("/dashboard");
  }

  let partnerId: string | null = null;
  if (role === "EXTERNAL_PARTNER") {
    const partner = await prisma.externalPartner.findUnique({
      where: { userId: session.user.id },
    });
    if (!partner) redirect("/dashboard");
    partnerId = partner.id;
  }

  const [partners, invoices, students] = await Promise.all([
    role === "EXTERNAL_PARTNER"
      ? []
      : prisma.externalPartner.findMany({
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        }),
    prisma.invoice.findMany({
      where: partnerId ? { partnerId } : undefined,
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Partner portal</h1>

      {partners.length > 0 && (
        <Card title={`Partners (${partners.length})`}>
          <ul className="space-y-1 text-sm">
            {partners.map((p) => (
              <li key={p.id} className="rounded-lg border px-3 py-2">
                <span className="font-medium">{p.organizationName}</span>{" "}
                <Badge>{p.partnerType}</Badge>
                <span className="text-zinc-600"> · {p.user.name} ({p.user.email})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Submit invoice">
        <SubmitForm action={submitInvoice} className="space-y-2 text-sm">
          {role !== "EXTERNAL_PARTNER" && (
            <select name="partnerId" required className="w-full rounded-lg border px-3 py-2">
              <option value="">Select partner…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.organizationName} ({p.partnerType})
                </option>
              ))}
            </select>
          )}
          <select name="studentId" required className="w-full rounded-lg border px-3 py-2">
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.name} — {s.schoolName}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select name="type" className="rounded-lg border px-3 py-2">
              <option value="TUITION">TUITION</option>
              <option value="RENT">RENT</option>
            </select>
            <input name="amount" type="number" step="0.01" min={0} required placeholder="Amount" className="w-40 rounded-lg border px-3 py-2" />
          </div>
          <UploadField name="documentUrl" label="Invoice document" required />
          <button type="submit" className={btnGhostCls}>Submit invoice</button>
        </SubmitForm>
      </Card>

      <Card title={`Invoices (${invoices.length})`}>
        <ul className="space-y-1 text-sm">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <span>{inv.student.user.name} · {inv.type} · {kes(inv.amount)}</span>
              <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
              <a href={inv.documentUrl} target="_blank" rel="noreferrer" className="underline">doc</a>
            </li>
          ))}
          {invoices.length === 0 && <li>No invoices yet.</li>}
        </ul>
      </Card>
    </main>
  );
}
