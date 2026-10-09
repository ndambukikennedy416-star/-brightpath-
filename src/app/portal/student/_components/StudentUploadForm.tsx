"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/portal/client";
import { notifyDocumentUploaded } from "@/lib/portal/notify";
import { notifyToast } from "@/app/admin/users/_components/Toast";

const TYPES: Array<[string, string]> = [
  ["Fee Structure", "fee_structure"],
  ["Result Slip", "result_slip"],
  ["Landlord Invoice", "landlord_invoice"],
  ["ID", "id"],
  ["Other", "other"],
];

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg"]);
const MAX_BYTES = 5 * 1024 * 1024;

export default function StudentUploadForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const file = fd.get("file") as File | null;
      const type = String(fd.get("type") ?? "Other");
      if (!file || file.size === 0) throw new Error("Choose a file first.");
      if (!ALLOWED_MIME.has(file.type)) throw new Error("PDF or JPG only.");
      if (file.size > MAX_BYTES) throw new Error("File must be under 5 MB.");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired. Sign in again.");

      const tag = TYPES.find(([label]) => label === type)?.[1] ?? "other";
      const path = `${user.id}/${tag}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upError } = await supabase.storage
        .from("student-docs")
        .upload(path, file);
      if (upError) throw upError;

      const { data: doc, error: dbError } = await supabase
        .from("student_documents")
        .insert({
          student_id: user.id,
          type,
          file_url: path,
          status: "pending",
        })
        .select("id")
        .single();
      if (dbError) throw dbError;

      await notifyDocumentUploaded(doc.id).catch(() => undefined);
      notifyToast("Document uploaded — pending verification.");
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-50";

  return (
    <form onSubmit={onSubmit} className="grid gap-2 text-sm">
      <div className="grid gap-2 md:grid-cols-2">
        <select name="type" required aria-label="Document type" disabled={busy} className={inputCls} defaultValue="Fee Structure">
          {TYPES.map(([label]) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
        <input name="file" type="file" required disabled={busy} aria-label="File (PDF or JPG, max 5 MB)" accept="application/pdf,image/jpeg,.pdf,.jpg,.jpeg" className={inputCls} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload document"}
        </button>
      </div>
    </form>
  );
}
