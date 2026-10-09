"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/portal/client";
import { notifyToast } from "@/app/admin/users/_components/Toast";

const TYPES = ["Fee Structure", "Result Slip", "Landlord Invoice", "ID", "Other"];

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
      if (file.size > 10 * 1024 * 1024) throw new Error("File must be under 10 MB.");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired. Sign in again.");

      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upError } = await supabase.storage
        .from("student-docs")
        .upload(path, file);
      if (upError) throw upError;

      const { error: dbError } = await supabase.from("student_documents").insert({
        student_id: user.id,
        type,
        file_url: path,
        status: "pending",
      });
      if (dbError) throw dbError;

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
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input name="file" type="file" required disabled={busy} aria-label="File" className={inputCls} />
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
