import { db } from "@/lib/db";
import { expenses, fiscalYears, parties } from "@/lib/db/schema";
import { validateAmounts, type ExpenseInput } from "@/lib/validation/expense";
import { parseMiti } from "@/lib/nepali-date";
import {
  checkInvoiceDuplicate,
  findSuspiciousDuplicates,
  type ExpenseFingerprint,
} from "@/lib/expenses/duplicates";
import { and, eq } from "drizzle-orm";

export type { ExpenseInput };

export interface ExpenseContext {
  fiscalYear: typeof fiscalYears.$inferSelect;
  party: typeof parties.$inferSelect;
  vatRate: string;
}

export interface DuplicateMessages {
  duplicateExact: string;
  duplicateInvoice: string;
  suspicious: (count: number) => string;
}

/**
 * Builds the duplicate-check fingerprint for an expense input.
 */
export function buildExpenseFingerprint(
  companyId: string,
  data: ExpenseInput,
): ExpenseFingerprint {
  return {
    companyId,
    fiscalYearId: data.fiscalYearId,
    partyId: data.partyId,
    invoiceNumber: data.invoiceNumber ?? null,
    miti: data.miti,
    taxableAmount: data.taxableAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
  };
}

/**
 * Loads the fiscal year and party references for an expense input.
 *
 * @param companyId - The company that must own the referenced records
 * @param data - The validated expense input
 * @param defaultVatRate - Fallback VAT rate when the input does not specify one
 * @returns The resolved references, or an error message string if any are missing
 */
export async function loadExpenseReferences(
  companyId: string,
  data: ExpenseInput,
  defaultVatRate: string,
): Promise<{ context: ExpenseContext } | { error: string }> {
  const fiscalYear = (
    await db
      .select()
      .from(fiscalYears)
      .where(
        and(eq(fiscalYears.id, data.fiscalYearId), eq(fiscalYears.companyId, companyId)),
      )
      .limit(1)
  )[0];
  if (!fiscalYear) return { error: "Fiscal year not found" };

  const party = (
    await db
      .select()
      .from(parties)
      .where(and(eq(parties.id, data.partyId), eq(parties.companyId, companyId)))
      .limit(1)
  )[0];
  if (!party) return { error: "Party not found" };

  return {
    context: {
      fiscalYear,
      party,
      vatRate: data.vatRate ?? defaultVatRate,
    },
  };
}

export interface PreparedExpense {
  context: ExpenseContext;
  fingerprint: ExpenseFingerprint;
  warnings: string[];
  monthName: string;
  insert: typeof expenses.$inferInsert;
}

/**
 * Prepares an already-validated expense for insertion: resolves references, checks
 * duplicates, collects warnings, and builds the insert payload.
 *
 * @param companyId - The company the expense belongs to
 * @param data - The validated expense input
 * @param defaultVatRate - Fallback VAT rate when the input does not specify one
 * @param messages - Message templates for duplicate and warning strings
 * @returns A prepared row ready for insert, or an error message
 */
export async function prepareValidatedExpense(
  companyId: string,
  data: ExpenseInput,
  defaultVatRate: string,
  messages: DuplicateMessages,
): Promise<{ ok: true; prepared: PreparedExpense } | { ok: false; error: string }> {
  const references = await loadExpenseReferences(companyId, data, defaultVatRate);
  if ("error" in references) return { ok: false, error: references.error };

  const { context } = references;
  const fingerprint = buildExpenseFingerprint(companyId, data);

  const duplicate = await checkInvoiceDuplicate(fingerprint);
  if (duplicate) {
    return {
      ok: false,
      error:
        duplicate.level === "exact" ? messages.duplicateExact : messages.duplicateInvoice,
    };
  }

  const warnings: string[] = [];
  if (!data.invoiceNumber) {
    const suspicious = await findSuspiciousDuplicates(fingerprint);
    if (suspicious.length > 0) {
      warnings.push(messages.suspicious(suspicious.length));
    }
  }

  warnings.push(
    ...validateAmounts({
      quantity: data.quantity ?? null,
      rate: data.rate ?? null,
      taxableAmount: data.taxableAmount,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
      vatRate: context.vatRate,
    }),
  );

  const miti = parseMiti(data.miti);
  if (!miti.ok) return { ok: false, error: `Invalid date: ${miti.error}` };

  return {
    ok: true,
    prepared: {
      context,
      fingerprint,
      warnings,
      monthName: miti.monthName,
      insert: {
        companyId,
        fiscalYearId: data.fiscalYearId,
        partyId: data.partyId,
        categoryId: data.categoryId,
        locationId: data.locationId ?? null,
        miti: data.miti,
        nepaliMonth: miti.monthName,
        invoiceNumber: data.invoiceNumber ?? null,
        item: data.item,
        quantity: data.quantity ?? null,
        rate: data.rate ?? null,
        taxableAmount: data.taxableAmount,
        vatAmount: data.vatAmount,
        totalAmount: data.totalAmount,
        vatRate: context.vatRate,
        remarks: data.remarks ?? null,
      },
    },
  };
}
