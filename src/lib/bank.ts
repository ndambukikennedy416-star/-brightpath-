// Bank-detail access control (no encryption infra in scope):
// full values are only served to ADMIN / FINANCE_OFFICER.
// Everyone else sees a masked value (last 4 chars). Centralized here so every
// display site applies the same rule.
export function maskAccount(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = value.replace(/\s/g, "");
  if (digits.length <= 4) return "••••";
  return `••••${digits.slice(-4)}`;
}

export function canViewFullBankDetails(role: string): boolean {
  return role === "ADMIN" || role === "FINANCE_OFFICER";
}

export function bankDisplay(
  role: string,
  value: string | null | undefined
): string {
  if (!value) return "—";
  return canViewFullBankDetails(role) ? value : maskAccount(value);
}
