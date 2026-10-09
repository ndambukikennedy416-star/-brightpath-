import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFeeStructure } from "@/lib/actions/admin";
import { Card, Field, btnGhostCls, inputCls } from "@/components/ui";
import { kes } from "@/lib/format";
import SubmitForm from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER"].includes(session.user.role)) redirect("/dashboard");

  const fees = await prisma.feeStructure.findMany({ orderBy: [{ schoolName: "asc" }, { academicYear: "desc" }] });

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Fee structures & caps</h1>

      <Card title="Schools">
        <ul className="space-y-1 text-sm">
          {fees.map((f) => (
            <li key={f.id} className="rounded-lg border px-3 py-2">
              {f.schoolName} · {f.academicYear} · cap {kes(f.tuitionCap)}
              {f.notes && <span className="text-zinc-600"> · {f.notes}</span>}
            </li>
          ))}
          {fees.length === 0 && <li>No fee structures yet.</li>}
        </ul>
      </Card>

      <Card title="Add / update fee structure">
        <SubmitForm action={createFeeStructure} className="grid gap-3 text-sm md:grid-cols-2">
          <Field label="School"><input name="schoolName" required minLength={2} className={inputCls} /></Field>
          <Field label="Academic year"><input name="academicYear" type="number" required placeholder="2026" className={inputCls} /></Field>
          <Field label="Tuition cap (KSh)"><input name="tuitionCap" type="number" step="0.01" min={0} required className={inputCls} /></Field>
          <Field label="Notes"><input name="notes" className={inputCls} /></Field>
          <div><button type="submit" className={btnGhostCls}>Save</button></div>
        </SubmitForm>
      </Card>
    </main>
  );
}
