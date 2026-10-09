"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

// Fire-and-forget wrapper for Server Actions used directly as form actions.
// Next.js 16 types `<form action>` as returning void; this preserves the
// clicked submit button's name/value (needed for approve/disburse flows)
// and surfaces action errors inline. Pages revalidate on success.
export default function SubmitForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<unknown>;
  children: ReactNode;
  className?: string;
}) {
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as
      | (HTMLElement & { name?: string; value?: string })
      | null;
    if (submitter?.name) fd.append(submitter.name, submitter.value ?? "");
    const result = (await action(fd)) as { ok?: boolean; message?: string } | null;
    if (result && result.ok === false) {
      setError(result.message ?? "Action failed. Check required fields.");
    }
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </form>
  );
}
