import { parseMiti } from "@/lib/nepali-date";
import type { LedgerRow } from "./ledger-types";

/**
 * Determines the fiscal year for a Bikram Sambat date using
 * parseMiti's own fiscal-year calculation.
 */
export function getFiscalYearFromMiti(
  miti: string,
): { ok: true; fiscalYearName: string } | { ok: false; error: string } {
  const parsed = parseMiti(miti);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, fiscalYearName: parsed.fiscalYearName };
}

/**
 * Validates a ledger row against required fields, fiscal year constraints,
 * existing invoices, and duplicates within the current batch.
 *
 * Returns error messages; an empty array means the row is valid.
 */
export function validateLedgerRow(
  row: LedgerRow,
  allRows: LedgerRow[],
  existingInvoices: Set<string>,
  fiscalYearName: string,
): string[] {
  const errors: string[] = [];

  if (!row.miti) {
    errors.push("Miti required");
  } else {
    const fy = getFiscalYearFromMiti(row.miti);
    if (!fy.ok) {
      errors.push("Invalid date");
    } else if (fy.fiscalYearName !== fiscalYearName) {
      errors.push(`Date falls in FY ${fy.fiscalYearName}`);
    }
  }

  if (!row.partyResolved || !row.partyId) errors.push("Select a valid party");
  if (!row.invoiceNumber.trim()) errors.push("Invoice number required");
  if (!row.categoryId) errors.push("Category required");
  if (!row.taxableAmount || parseFloat(row.taxableAmount) <= 0)
    errors.push("Taxable amount must be greater than 0");

  if (row.invoiceNumber && row.partyId) {
    const key = `${row.partyId}|${row.invoiceNumber}`;
    if (existingInvoices.has(key)) {
      errors.push(`Invoice ${row.invoiceNumber} already exists for this party`);
    }
    const dupesInBatch = allRows.filter(
      (r) =>
        r.id !== row.id &&
        r.partyId === row.partyId &&
        r.invoiceNumber === row.invoiceNumber &&
        r.invoiceNumber !== "",
    );
    if (dupesInBatch.length > 0) {
      errors.push("Duplicate in batch");
    }
  }

  return errors;
}
