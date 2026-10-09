"use client";

import { useState } from "react";
import type { FormEvent } from "react";

// File picker that uploads to /api/upload and stores the URL in a hidden field.
export default function UploadField({ name, label, required }: { name: string; label: string; required?: boolean }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onChange(e: FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-sm">
      <span className="font-medium">{label}</span>
      <input type="hidden" name={name} value={url} required={required} />
      <div className="mt-1 flex items-center gap-2">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={onChange}
          className="text-sm"
        />
        {busy && <span className="text-zinc-500">Uploading…</span>}
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-green-700 underline">
            Attached ✓
          </a>
        )}
      </div>
      {error && <p className="mt-1 text-red-700">{error}</p>}
      {required && !url && <p className="mt-1 text-zinc-500">Attach a file to submit.</p>}
    </div>
  );
}
