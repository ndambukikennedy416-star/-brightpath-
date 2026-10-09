"use client";

import ActionForm from "@/components/ActionForm";
import UploadField from "@/components/UploadField";
import { saveDocument } from "@/lib/actions/documents";

// Students upload ID / admission letter / lease agreement.
// saveDocument() forces the student's OWN id server-side, so the hidden
// field below is only a fallback for staff previews — never trusted.
export default function DocumentUploadForm({ studentId }: { studentId: string }) {
  return (
    <ActionForm
      action={async (_s, fd) => saveDocument(fd)}
      submitLabel="Upload document"
      onSuccess="Document uploaded — pending verification."
    >
      <input type="hidden" name="studentId" value={studentId} />
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <label className="block">
          <span className="font-medium">Type</span>
          <select name="type" className="mt-1 w-full rounded-lg border px-3 py-2" required>
            <option value="ID">National ID</option>
            <option value="ADMISSION_LETTER">Admission letter</option>
            <option value="LEASE_AGREEMENT">Lease agreement</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <UploadField name="fileUrl" label="File (PDF/image)" required />
      </div>
    </ActionForm>
  );
}
