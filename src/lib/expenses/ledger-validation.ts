import { parseMiti } from "@/lib/nepali-date";
import type { LedgerRow, ValidationResult } from "./ledger-types";
import { getInvoiceKey } from "./ledger-utils";
import {
  STATUS_PENDING,
  STATUS_ERROR,
  STATUS_DUPLICATE,
  STATUS_INCOMPLETE,
} from "@/lib/status-constants";

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
 * Builds an index of invoice keys across all rows, counting how many
 * times each key appears. Used for O(1) in-batch duplicate detection.
 */
export function buildDuplicateIndex(rows: LedgerRow[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const row of rows) {
    if (!row.invoiceNumber || !row.partyId) continue;
    const key = getInvoiceKey(row.partyId, row.invoiceNumber);
    index.set(key, (index.get(key) ?? 0) + 1);
  }
  return index;
}

/**
 * Validates a ledger row through a single pipeline that determines
 * its status, first error, and any warnings.
 *
 * @param row - The ledger row to validate
 * @param duplicateIndex - Pre-built map of invoiceKey → count for in-batch duplicates
 * @param existingInvoices - Invoice keys already recorded for the fiscal year
 * @param fiscalYearName - The selected fiscal year name
 * @returns A single validation result: status, error, warnings
 */
export function validateLedgerRow(
  row: LedgerRow,
  duplicateIndex: Map<string, number>,
  existingInvoices: Set<string>,
  fiscalYearName: string,
): ValidationResult {
  // Incomplete: no user input at all
  if (!row.miti && !row.partyId && !row.taxableAmount) {
    return { status: STATUS_INCOMPLETE, error: undefined, warnings: [] };
  }

  const warnings: string[] = [];

  // Miti
  if (!row.miti) {
    return { status: STATUS_ERROR, error: "Miti required", warnings };
  }
  const fy = getFiscalYearFromMiti(row.miti);
  if (!fy.ok) {
    return { status: STATUS_ERROR, error: "Invalid date", warnings };
  }
  if (fy.fiscalYearName !== fiscalYearName) {
    return {
      status: STATUS_ERROR,
      error: `Date falls in FY ${fy.fiscalYearName} — expected ${fiscalYearName}. Check if this is an AD date.`,
      warnings,
    };
  }

  // Party
  if (!row.partyResolved || !row.partyId) {
    return { status: STATUS_ERROR, error: "Select a valid party", warnings };
  }

  // Invoice number
  if (!row.invoiceNumber.trim()) {
    return { status: STATUS_ERROR, error: "Invoice number required", warnings };
  }

  // Category
  if (!row.categoryId) {
    return { status: STATUS_ERROR, error: "Category required", warnings };
  }

  // Taxable amount
  if (!row.taxableAmount || parseFloat(row.taxableAmount) <= 0) {
    return {
      status: STATUS_ERROR,
      error: "Taxable amount must be greater than 0",
      warnings,
    };
  }

  // Duplicate checks (only when party + invoice are set)
  const key = getInvoiceKey(row.partyId, row.invoiceNumber);

  if (existingInvoices.has(key)) {
    return {
      status: STATUS_DUPLICATE,
      error: `Invoice ${row.invoiceNumber} already exists for this party`,
      warnings,
    };
  }

  if ((duplicateIndex.get(key) ?? 0) > 1) {
    return { status: STATUS_DUPLICATE, error: "Duplicate in batch", warnings };
  }

  return { status: STATUS_PENDING, error: undefined, warnings };
}
