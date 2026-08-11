export function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .toUpperCase();
}

export function normalizeVatNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}