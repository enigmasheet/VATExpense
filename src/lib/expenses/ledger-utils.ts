import type { LedgerRow } from "./ledger-types";
import { fromEnglishDate } from "@/lib/nepali-date";

/**
 * Returns a row-safe identifier, preferring crypto.randomUUID with a
 * fallback for environments that do not expose the crypto API.
 */
export function genRowId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `row-${++idCounter}-${Date.now()}`;
  }
}

let idCounter = 0;

/**
 * Returns today's Bikram Sambat date as a YYYY-MM-DD string.
 * Safe to call at module scope or in components — pure, no browser APIs.
 */
export function todayMiti(): string {
  try {
    return fromEnglishDate(new Date()).miti;
  } catch {
    return "";
  }
}

/**
 * Strips non-digits from raw input and inserts dashes to produce
 * a YYYY-MM-DD formatted string (up to 8 digits, 10 characters).
 *
 * Examples: "20830" → "2083-0", "20830415" → "2083-04-15"
 */
export function formatMitiInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/**
 * Normalizes an invoice number to lowercase-trimmed form.
 * Server comparisons are case-insensitive after trim+lowercase.
 */
export function normalizeInvoiceNumber(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Builds the client-side duplicate key matching the DB uniqueness rule:
 * companyId + fiscalYearId + partyId + invoiceNumber.
 *
 * Since companyId and fiscalYearId are fixed per LedgerGrid session,
 * the client key only needs partyId + normalized invoiceNumber.
 */
export function getInvoiceKey(partyId: string, invoiceNumber: string): string {
  return `${partyId}|${normalizeInvoiceNumber(invoiceNumber)}`;
}

/**
 * Creates an incomplete ledger row, carrying forward selected fields
 * from a previous row when provided. New rows auto-fill miti with
 * today's Bikram Sambat date.
 */
export function createLedgerRow(prev?: LedgerRow): LedgerRow {
  return {
    id: genRowId(),
    miti: prev?.miti ?? todayMiti(),
    partyId: "",
    partyName: "",
    partyResolved: false,
    locationId: prev?.locationId ?? null,
    locationName: prev?.locationName ?? null,
    invoiceNumber: "",
    categoryId: prev?.categoryId ?? "",
    categoryName: prev?.categoryName ?? "",
    taxableAmount: "",
    vatAmount: "",
    totalAmount: "",
    status: "incomplete",
  };
}
