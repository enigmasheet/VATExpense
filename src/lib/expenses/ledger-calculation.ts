import { round2 } from "@/lib/money";
import { VAT_RATE } from "@/lib/constants";

export const VAT_FACTOR = 1 + VAT_RATE / 100;

/**
 * Calculates VAT and the total amount from a taxable amount.
 */
export function calcFromTaxable(
  taxable: number,
): { vat: number; total: number } {
  const vat = round2((taxable * VAT_RATE) / 100);
  const total = round2(taxable + vat);
  return { vat, total };
}

/**
 * Derives taxable and VAT amounts from a VAT-inclusive total.
 */
export function calcFromTotal(
  total: number,
): { taxable: number; vat: number } {
  const taxable = round2(total / VAT_FACTOR);
  const vat = round2(total - taxable);
  return { taxable, vat };
}

export interface ParsedAmount {
  empty: boolean;
  valid: boolean;
  zero: boolean;
  negative: boolean;
  value: number;
}

/**
 * Distinguishes empty, invalid, zero, and negative amount strings.
 * Returns a structured result so callers never silently treat NaN as zero.
 */
export function parseAmount(value: string): ParsedAmount {
  const trimmed = value.trim();
  if (!trimmed) {
    return { empty: true, valid: false, zero: false, negative: false, value: 0 };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { empty: false, valid: false, zero: false, negative: false, value: 0 };
  }
  return {
    empty: false,
    valid: true,
    zero: n === 0,
    negative: n < 0,
    value: n,
  };
}
