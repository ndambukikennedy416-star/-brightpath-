import type { ReactNode } from "react";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5">
      {title && <h2 className="mb-3 text-[15px] font-bold tracking-tight text-stone-900">{title}</h2>}
      {children}
    </section>
  );
}

export function Badge({ tone = "zinc", children }: { tone?: "zinc" | "green" | "red" | "amber"; children: ReactNode }) {
  const tones: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-700",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function statusTone(status: string): "zinc" | "green" | "red" | "amber" {
  if (status === "DISBURSED" || status === "APPROVED" || status === "ACTIVE" || status === "GRADUATED") return "green";
  if (status === "REJECTED" || status === "FAILED" || status === "SUSPENDED" || status === "WITHDRAWN") return "red";
  if (status === "PENDING") return "amber";
  return "zinc";
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900";
export const btnCls = "rounded-lg bg-green-950 px-4 py-2 text-sm font-medium text-white hover:bg-green-900 disabled:opacity-50";
export const btnGhostCls = "rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100";
