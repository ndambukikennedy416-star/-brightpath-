// Defense-in-depth text sanitization for admin-entered fields.
// React escapes output on render; this strips HTML at the boundary so stored
// values (Name, Organization, Bank Details) cannot carry markup into exports,
// CSV downloads, or non-React consumers (emails, PDFs).
export function sanitizeText(value: unknown, maxLength = 1000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalText(
  value: unknown,
  maxLength = 1000
): string | undefined {
  if (value == null || value === "") return undefined;
  const clean = sanitizeText(value, maxLength);
  return clean === "" ? undefined : clean;
}
