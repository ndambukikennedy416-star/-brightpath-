import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessStudent } from "@/lib/rbac";
import { updateStudentProfile, updateStudentStatus } from "@/lib/actions/students";
import { createPayment, updatePaymentStatus } from "@/lib/actions/payments";
import { reviewClaim } from "@/lib/actions/claims";
import { upsertAcademicRecord } from "@/lib/actions/academics";
import { reviewInvoice, submitInvoice } from "@/lib/actions/invoices";
import { saveDocument, verifyDocument, rejectDocument } from "@/lib/actions/documents";
import { createLease } from "@/lib/actions/admin";
import { ClaimForm } from "@/components/forms";
import SubmitForm from "@/components/SubmitForm";
import UploadField from "@/components/UploadField";
import { Badge, Card, Field, btnGhostCls, inputCls, statusTone } from "@/components/ui";
import { kes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const role = session.user.role;

  const allowedPromise = canAccessStudent(session.user.id, role, id);
  const studentPromise = prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      payments: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      expenseClaims: { orderBy: { createdAt: "desc" } },
      academicRecords: { orderBy: { recordedAt: "asc" } },
      lessonProgress: { include: { lesson: true } },
      documents: { orderBy: { createdAt: "desc" } },
      leases: { orderBy: { startDate: "desc" } },
    },
  });
  const [allowed, student] = await Promise.all([allowedPromise, studentPromise]);
  if (!allowed) redirect("/dashboard");
  if (!student) notFound();

  const isStaff = ["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT"].includes(role);
  const isFinance = ["ADMIN", "FINANCE_OFFICER"].includes(role);

  const disbursed = student.payments
    .filter((p) => p.status === "DISBURSED")
    .reduce((s, p) => s + Number(p.amount), 0);
  const utilization = Number(student.totalBudget) > 0 ? Math.round((disbursed / Number(student.totalBudget)) * 100) : 0;

  const timeline = [
    ...student.payments.map((p) => ({
      date: p.createdAt,
      kind: isStaff
        ? `Payment ${p.type} ${p.status} $${Number(p.amount)}`
        : `Payment ${p.type} ${p.status}`,
    })),
    ...student.academicRecords.map((r) => ({
      date: r.recordedAt,
      kind: `Term ${r.term} GPA ${r.gpa?.toString() ?? "—"} attendance ${r.attendance?.toString() ?? "—"}%`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <header className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{student.user.name}</h1>
          <Badge tone={statusTone(student.status)}>{student.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          {student.user.email} · {student.schoolName} · Year {student.currentYear}
        </p>
        {isStaff && (
          <>
            <p className="text-sm text-zinc-600">
              Budget {kes(student.totalBudget)} · Disbursed {kes(disbursed)} ({utilization}%)
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full bg-black" style={{ width: `${Math.min(utilization, 100)}%` }} />
            </div>
          </>
        )}
        {isStaff && (
          <SubmitForm action={updateStudentStatus} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <input type="hidden" name="studentId" value={student.id} />
            <select name="status" defaultValue={student.status} className="rounded-lg border px-2 py-1.5">
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="GRADUATED">GRADUATED</option>
              <option value="WITHDRAWN">WITHDRAWN</option>
            </select>
            <button type="submit" className={btnGhostCls}>Update status</button>
          </SubmitForm>
        )}
      </header>

      {isStaff && (
        <Card title="Profile & payout details">
          <SubmitForm action={updateStudentProfile} className="grid gap-3 text-sm md:grid-cols-3">
            <input type="hidden" name="studentId" value={student.id} />
            <Field label="School"><input name="schoolName" defaultValue={student.schoolName} required className={inputCls} /></Field>
            <Field label="Year"><input name="currentYear" type="number" min={1} max={10} defaultValue={student.currentYear} required className={inputCls} /></Field>
            <Field label="Total budget"><input name="totalBudget" type="number" step="0.01" defaultValue={Number(student.totalBudget)} required className={inputCls} /></Field>
            <Field label="Phone"><input name="phone" defaultValue={student.phone ?? ""} className={inputCls} /></Field>
            <Field label="Bank"><input name="bankName" defaultValue={student.bankName ?? ""} className={inputCls} /></Field>
            <Field label="Account"><input name="bankAccountNumber" defaultValue={student.bankAccountNumber ?? ""} className={inputCls} /></Field>
            <Field label="MM provider"><input name="mobileMoneyProvider" defaultValue={student.mobileMoneyProvider ?? ""} className={inputCls} /></Field>
            <Field label="MM number"><input name="mobileMoneyNumber" defaultValue={student.mobileMoneyNumber ?? ""} className={inputCls} /></Field>
            <div><button type="submit" className={btnGhostCls}>Save profile</button></div>
          </SubmitForm>
        </Card>
      )}

      <Card title={`Payments (${student.payments.length})`}>
        <ul className="space-y-1 text-sm">
          {student.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <span>{isStaff ? `${p.type} · ${kes(p.amount)}` : p.type}</span>
              <Badge tone={statusTone(p.status)}>{p.status}</Badge>
              <span className="text-zinc-500">{p.createdAt.toLocaleDateString()}</span>
              {isFinance && p.status === "DISBURSED" && (
                <a href={`/api/receipts/${p.id}`} className="underline">
                  Receipt
                </a>
              )}
              {isFinance && (p.status === "PENDING" || p.status === "APPROVED") && (
                <SubmitForm action={updatePaymentStatus} className="ml-auto flex gap-1">
                  <input type="hidden" name="paymentId" value={p.id} />
                  {p.status === "PENDING" && (
                    <button type="submit" name="status" value="APPROVED" className={btnGhostCls}>Approve</button>
                  )}
                  <button type="submit" name="status" value="DISBURSED" className={btnGhostCls}>Disburse</button>
                  <button type="submit" name="status" value="REJECTED" className={btnGhostCls}>Reject</button>
                </SubmitForm>
              )}
            </li>
          ))}
          {student.payments.length === 0 && <li>No payments yet.</li>}
        </ul>
        {isFinance && (
          <SubmitForm action={createPayment} className="mt-3 flex flex-wrap gap-2 text-sm">
            <input type="hidden" name="studentId" value={student.id} />
            <select name="type" className="rounded-lg border px-2 py-1.5">
              <option value="TUITION">TUITION</option>
              <option value="RENT">RENT</option>
              <option value="STIPEND">STIPEND</option>
              <option value="EMERGENCY">EMERGENCY</option>
            </select>
            <input name="amount" type="number" step="0.01" min={0} required placeholder="Amount" className="w-32 rounded-lg border px-2 py-1.5" />
            <button type="submit" className={btnGhostCls}>Record payment</button>
          </SubmitForm>
        )}
      </Card>

      <Card title={`Invoices (${student.invoices.length})`}>
        <ul className="space-y-1 text-sm">
          {student.invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <span>{isStaff ? `${inv.type} · ${kes(inv.amount)}` : inv.type}</span>
              <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
              <a href={inv.documentUrl} target="_blank" rel="noreferrer" className="underline">document</a>
              {isFinance && inv.status === "PENDING" && (
                <SubmitForm action={reviewInvoice} className="ml-auto flex gap-1">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <button type="submit" name="status" value="APPROVED" className={btnGhostCls}>Approve</button>
                  <button type="submit" name="status" value="REJECTED" className={btnGhostCls}>Reject</button>
                </SubmitForm>
              )}
            </li>
          ))}
          {student.invoices.length === 0 && <li>No invoices yet.</li>}
        </ul>
        {isStaff && (
          <SubmitForm action={submitInvoice} className="mt-3 space-y-2 text-sm">
            <input type="hidden" name="studentId" value={student.id} />
            <div className="flex flex-wrap gap-2">
              <select name="type" className="rounded-lg border px-2 py-1.5">
                <option value="TUITION">TUITION</option>
                <option value="RENT">RENT</option>
              </select>
              <input name="amount" type="number" step="0.01" min={0} required placeholder="Amount" className="w-32 rounded-lg border px-2 py-1.5" />
            </div>
            <UploadField name="documentUrl" label="Invoice document" required />
            <button type="submit" className={btnGhostCls}>Submit invoice</button>
          </SubmitForm>
        )}
      </Card>

      <Card title={`Expense claims (${student.expenseClaims.length})`}>
        <ul className="space-y-1 text-sm">
          {student.expenseClaims.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <span>{isStaff ? `${kes(c.amount)} · ${c.description}` : c.description}</span>
              <Badge tone={statusTone(c.status)}>{c.status}</Badge>
              {c.isEmergency && <Badge tone="red">EMERGENCY</Badge>}
              <a href={c.receiptUrl} target="_blank" rel="noreferrer" className="underline">receipt</a>
              {isFinance && c.status === "PENDING" && (
                <SubmitForm action={reviewClaim} className="ml-auto flex gap-1">
                  <input type="hidden" name="claimId" value={c.id} />
                  <button type="submit" name="status" value="APPROVED" className={btnGhostCls}>Approve</button>
                  <button type="submit" name="status" value="REJECTED" className={btnGhostCls}>Reject</button>
                </SubmitForm>
              )}
            </li>
          ))}
          {student.expenseClaims.length === 0 && <li>No claims yet.</li>}
        </ul>
        {(role === "STUDENT" || isStaff) && (
          <div className="mt-3 border-t pt-3">
            <h3 className="mb-2 text-sm font-medium">New claim</h3>
            <ClaimForm studentId={isStaff ? student.id : undefined} />
          </div>
        )}
      </Card>

      <Card title={`Academics (${student.academicRecords.length})`}>
        <ul className="space-y-1 text-sm">
          {student.academicRecords.map((r) => (
            <li key={r.id} className="rounded-lg border px-3 py-2">
              {r.term} · GPA {r.gpa?.toString() ?? "—"} · attendance {r.attendance?.toString() ?? "—"}%
              {(Number(r.gpa ?? 99) < 2 || Number(r.attendance ?? 100) < 80) && (
                <Badge tone="red"> at-risk</Badge>
              )}
            </li>
          ))}
          {student.academicRecords.length === 0 && <li>No records yet.</li>}
        </ul>
        {isStaff && (
          <SubmitForm action={upsertAcademicRecord} className="mt-3 flex flex-wrap gap-2 text-sm">
            <input type="hidden" name="studentId" value={student.id} />
            <input name="term" required placeholder="Term (e.g. 2026-T1)" className="rounded-lg border px-2 py-1.5" />
            <input name="gpa" type="number" step="0.01" min={0} max={4} placeholder="GPA" className="w-24 rounded-lg border px-2 py-1.5" />
            <input name="attendance" type="number" step="0.01" min={0} max={100} placeholder="Attend %" className="w-28 rounded-lg border px-2 py-1.5" />
            <button type="submit" className={btnGhostCls}>Save record</button>
          </SubmitForm>
        )}
      </Card>

      <Card title={`Document vault (${student.documents.length})`}>
        <ul className="space-y-1 text-sm">
          {student.documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <span>{d.type}</span>
              <Badge tone={d.status === "VERIFIED" ? "green" : d.status === "REJECTED" ? "red" : "amber"}>{d.status}</Badge>
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className="underline">view</a>
              {isStaff && d.status === "PENDING" && (
                <SubmitForm action={verifyDocument} className="ml-auto flex gap-1">
                  <input type="hidden" name="documentId" value={d.id} />
                  <button type="submit" className={btnGhostCls}>Verify</button>
                </SubmitForm>
              )}
              {isStaff && d.status === "PENDING" && (
                <SubmitForm action={rejectDocument} className="flex gap-1">
                  <input type="hidden" name="documentId" value={d.id} />
                  <button type="submit" className={btnGhostCls}>Reject</button>
                </SubmitForm>
              )}
            </li>
          ))}
          {student.documents.length === 0 && <li>No documents yet.</li>}
        </ul>
        {(role === "STUDENT" || isStaff) && (
          <SubmitForm action={saveDocument} className="mt-3 space-y-2 text-sm">
            <input type="hidden" name="studentId" value={student.id} />
            <select name="type" className="rounded-lg border px-2 py-1.5">
              <option value="ID">ID</option>
              <option value="ADMISSION_LETTER">ADMISSION_LETTER</option>
              <option value="LEASE_AGREEMENT">LEASE_AGREEMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
            <UploadField name="fileUrl" label="File" required />
            <button type="submit" className={btnGhostCls}>Add to vault</button>
          </SubmitForm>
        )}
      </Card>

      <Card title={`Leases (${student.leases.length})`}>
        <ul className="space-y-1 text-sm">
          {student.leases.map((l) => (
            <li key={l.id} className="rounded-lg border px-3 py-2">
              {l.landlordName}
              {isStaff && <> · {kes(l.monthlyRent)}/mo</>} ·{" "}
              {l.startDate.toLocaleDateString()} → {l.endDate.toLocaleDateString()}
              {l.address && <span className="text-zinc-600"> · {l.address}</span>}
            </li>
          ))}
          {student.leases.length === 0 && <li>No leases yet.</li>}
        </ul>
        {isFinance && (
          <SubmitForm action={createLease} className="mt-3 flex flex-wrap gap-2 text-sm">
            <input type="hidden" name="studentId" value={student.id} />
            <input name="landlordName" required placeholder="Landlord" className="rounded-lg border px-2 py-1.5" />
            <input name="monthlyRent" type="number" step="0.01" min={0} required placeholder="Rent/mo" className="w-28 rounded-lg border px-2 py-1.5" />
            <input name="startDate" type="date" required className="rounded-lg border px-2 py-1.5" />
            <input name="endDate" type="date" required className="rounded-lg border px-2 py-1.5" />
            <input name="address" placeholder="Address" className="rounded-lg border px-2 py-1.5" />
            <button type="submit" className={btnGhostCls}>Add lease</button>
          </SubmitForm>
        )}
      </Card>

      <Card title="Literacy unlock">
        <ul className="space-y-1 text-sm">
          {student.lessonProgress.map((lp) => (
            <li key={lp.id} className="rounded-lg border px-3 py-2">
              {lp.lesson.title} — {lp.completed ? <Badge tone="green">completed</Badge> : <Badge tone="amber">pending</Badge>}
            </li>
          ))}
          {student.lessonProgress.length === 0 && <li>No lessons assigned yet.</li>}
        </ul>
        <Link href="/literacy" className="mt-2 inline-block text-sm underline">Open literacy →</Link>
      </Card>

      <Card title="Correlation view (finance vs academics)">
        <ol className="space-y-1 text-sm">
          {timeline.map((t, i) => (
            <li key={i} className="rounded bg-zinc-100 px-3 py-2">
              {t.date.toLocaleDateString()} — {t.kind}
            </li>
          ))}
          {timeline.length === 0 && <li>No events yet.</li>}
        </ol>
      </Card>
    </main>
  );
}
