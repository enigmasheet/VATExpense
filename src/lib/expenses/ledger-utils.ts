import type { LedgerRow } from "./ledger-types";

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
 * from a previous row when provided.
 */
export function createLedgerRow(prev?: LedgerRow): LedgerRow {
  return {
    id: genRowId(),
    miti: prev?.miti ?? "",
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
