// Single currency formatter for the whole app: Kenyan Shilling.
export function kes(value: number | string | { toString(): string }): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "KSh —";
  const rounded = Math.round(n * 100) / 100;
  const out = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: rounded % 1 !== 0 ? 2 : 0,
  }).format(rounded);
  return out.replace(/^Ksh/, "KSh");
}
