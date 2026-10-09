"use client";

import { createStudent, bulkImportStudents } from "@/lib/actions/students";
import { submitClaim } from "@/lib/actions/claims";
import ActionForm from "@/components/ActionForm";
import UploadField from "@/components/UploadField";
import { Field, inputCls } from "@/components/ui";

export function NewStudentForm() {
  return (
    <ActionForm action={async (_s, fd) => createStudent(fd)} submitLabel="Create beneficiary" onSuccess="Beneficiary created.">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Full name">
          <input name="name" required minLength={2} className={inputCls} />
        </Field>
        <Field label="Email (login)">
          <input name="email" type="email" required className={inputCls} />
        </Field>
        <Field label="Temporary password (min 8)">
          <input name="password" type="password" required minLength={8} className={inputCls} />
        </Field>
        <Field label="School">
          <input name="schoolName" required minLength={2} className={inputCls} />
        </Field>
        <Field label="Current year">
          <input name="currentYear" type="number" min={1} max={10} required className={inputCls} />
        </Field>
        <Field label="Total budget (KSh)">
          <input name="totalBudget" type="number" step="0.01" min={0} required className={inputCls} />
        </Field>
        <Field label="Phone">
          <input name="phone" className={inputCls} />
        </Field>
        <Field label="Bank name">
          <input name="bankName" className={inputCls} />
        </Field>
        <Field label="Bank account">
          <input name="bankAccountNumber" className={inputCls} />
        </Field>
        <Field label="Mobile money provider">
          <input name="mobileMoneyProvider" placeholder="e.g. M-Pesa" className={inputCls} />
        </Field>
        <Field label="Mobile money number">
          <input name="mobileMoneyNumber" className={inputCls} />
        </Field>
      </div>
    </ActionForm>
  );
}

export function ImportStudentsForm() {
  return (
    <ActionForm action={async (_s, fd) => bulkImportStudents(fd)} submitLabel="Import" onSuccess="Import finished.">
      <textarea
        name="csv"
        rows={10}
        required
        placeholder={"Amina Diallo,amina@example.com,Secret123!,Nairobi High,2,5000\nBrian Otieno,brian@example.com,Secret123!,Nairobi High,1,5000"}
        className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
      />
    </ActionForm>
  );
}

export function ClaimForm({ studentId }: { studentId?: string }) {
  return (
    <ActionForm action={async (_s, fd) => submitClaim(fd)} submitLabel="Submit claim" onSuccess="Claim submitted for review.">
      {studentId && <input type="hidden" name="studentId" value={studentId} />}
      <Field label="Amount (KSh)">
        <input name="amount" type="number" step="0.01" min={0} required className={inputCls} />
      </Field>
      <Field label="Description">
        <textarea name="description" required minLength={3} maxLength={1000} className={inputCls} />
      </Field>
      <UploadField name="receiptUrl" label="Receipt (PDF/image)" required />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isEmergency" value="true" />
        Emergency out-of-cycle request
      </label>
    </ActionForm>
  );
}
