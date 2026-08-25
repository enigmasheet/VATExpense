/** Nepali digit grouping: 855706.00 → "8,55,706.00" */
export function nepaliGroupedNumber(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const [int, frac = "00"] = abs.toFixed(2).split(".");
  if (int.length <= 3) {
    return `${sign}${int}.${frac}`;
  }
  const last3 = int.slice(-3);
  let rest = int.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${sign}${parts.join(",")},${last3}.${frac}`;
}

export function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "–";
  return `Rs. ${nepaliGroupedNumber(Number(value))}`;
}

export function formatMiti(miti: string): string {
  return miti; // already YYYY-MM-DD; display copy can wrap later
}

export function formatDate(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) return "–";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Sanitizes a value for safe CSV export by neutralizing formula-injection characters.
 * Prefixes = + - @ with a single quote (') so Excel/LibreOffice treat the cell as text.
 * Control characters and leading/trailing whitespace are stripped.
 */
export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value).replace(/[\r\n\t]/g, " ").trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return str;
}