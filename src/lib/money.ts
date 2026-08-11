/** Scale a number/string to a fixed-point string at the given scale, or null if invalid. */
export function toFixedStr(value: unknown, scale: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = typeof value === "string" ? value.replace(/,/g, "") : value;
  const n = typeof cleaned === "number" ? cleaned : Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(scale);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Numbers within this epsilon are considered equal (avoids float drift). */
export function amountsClose(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}