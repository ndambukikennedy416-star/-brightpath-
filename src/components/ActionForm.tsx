"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]> | string[];
  rowErrors?: string[];
  created?: number;
  atRisk?: string[];
} | null;

// Wraps a Server Action form and surfaces validation / result messages.
export default function ActionForm({
  action,
  children,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  onSuccess?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);

  return (
    <form action={dispatch} className="space-y-3">
      {children}
      {state && !state.ok && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message ?? "Please fix the highlighted fields."}
          {state.errors && !Array.isArray(state.errors) && (
            <ul className="mt-1 list-disc pl-5">
              {Object.entries(state.errors).map(([field, msgs]) => (
                <li key={field}>
                  {field}: {msgs.join(", ")}
                </li>
              ))}
            </ul>
          )}
          {state.errors && Array.isArray(state.errors) && (
            <ul className="mt-1 list-disc pl-5">
              {state.errors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {onSuccess ?? "Saved."}
          {typeof state.created === "number" && ` Created: ${state.created}.`}
          {state.atRisk && state.atRisk.length > 0 && ` At-risk: ${state.atRisk.join(" · ")}`}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
