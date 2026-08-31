import { db } from "@/lib/db";
import { expenses, fiscalYears, parties } from "@/lib/db/schema";
import { validateAmounts, type ExpenseInput } from "@/lib/validation/expense";
import { parseMiti, fyName } from "@/lib/nepali-date";
import {
  checkInvoiceDuplicate,
  findSuspiciousDuplicates,
  type ExpenseFingerprint,
} from "@/lib/expenses/duplicates";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Resolves a fiscal year from a BS miti date. Looks up by companyId + FY name.
 * If not found, auto-creates a new fiscal year.
 */
export async function resolveFiscalYear(
  companyId: string,
  miti: string,
): Promise<{ fiscalYearId: string; fiscalYear: typeof fiscalYears.$inferSelect } | { error: string }> {
  const parsed = parseMiti(miti);
  if (!parsed.ok) return { error: `Invalid date: ${parsed.error}` };

  const name = fyName(parsed.fiscalYear);

  // Look up existing FY
  const [existing] = await db
    .select()
    .from(fiscalYears)
    .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.name, name)))
    .limit(1);

  if (existing) return { fiscalYearId: existing.id, fiscalYear: existing };

  // Auto-create FY
  const [created] = await db
    .insert(fiscalYears)
    .values({
      companyId,
      name,
      startYear: parsed.fiscalYear,
      endYear: parsed.fiscalYear + 1,
      isActive: false,
    })
    .returning();

  return { fiscalYearId: created.id, fiscalYear: created };
}

export type { ExpenseInput };

export interface ExpenseContext {
  fiscalYear: typeof fiscalYears.$inferSelect;
  fiscalYearId: string;
  party: typeof parties.$inferSelect;
  vatRate: string;
}

export interface DuplicateMessages {
  duplicateExact: string;
  duplicateInvoice: string;
  suspicious: (count: number) => string;
}

export interface PreloadedContext {
  parties: Map<string, typeof parties.$inferSelect>;
  fiscalYearsById: Map<string, typeof fiscalYears.$inferSelect>;
  existingInvoiceKeys: Set<string>;
  defaultVatRate: string;
}

export async function preloadBatchContext(
  companyId: string,
  rows: ExpenseInput[],
  defaultVatRate: string,
): Promise<PreloadedContext> {
  const uniquePartyIds = [...new Set(rows.map((r) => r.partyId))];
  const uniqueFyIds = [...new Set(rows.map((r) => r.fiscalYearId).filter(Boolean) as string[])];

  const [loadedParties, loadedFys] = await Promise.all([
    uniquePartyIds.length > 0
      ? db
          .select()
          .from(parties)
          .where(and(inArray(parties.id, uniquePartyIds), eq(parties.companyId, companyId)))
      : Promise.resolve([]),
    uniqueFyIds.length > 0
      ? db
          .select()
          .from(fiscalYears)
          .where(and(inArray(fiscalYears.id, uniqueFyIds), eq(fiscalYears.companyId, companyId)))
      : Promise.resolve([]),
  ]);

  const partiesMap = new Map(loadedParties.map((p) => [p.id, p]));
  const fysById = new Map(loadedFys.map((fy) => [fy.id, fy]));

  const invoicePairs = rows
    .filter((r) => r.invoiceNumber)
    .map((r) => ({
      partyId: r.partyId,
      invoiceNumber: String(r.invoiceNumber).trim().toLowerCase(),
    }));

  const existingInvoiceKeys = new Set<string>();
  if (invoicePairs.length > 0) {
    const uniquePartyIdsForInv = [...new Set(invoicePairs.map((p) => p.partyId))];
    const uniqueInvoices = [...new Set(invoicePairs.map((p) => p.invoiceNumber))];

    const existingExpenses = await db
      .select({ partyId: expenses.partyId, invoiceNumber: expenses.invoiceNumber, fiscalYearId: expenses.fiscalYearId })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, companyId),
          eq(expenses.isDeleted, false),
          inArray(expenses.partyId, uniquePartyIdsForInv),
          inArray(expenses.invoiceNumber, uniqueInvoices),
        ),
      );

    for (const e of existingExpenses) {
      if (e.invoiceNumber) {
        existingInvoiceKeys.add(`${companyId}:${e.fiscalYearId}:${e.partyId}:${e.invoiceNumber}`);
      }
    }
  }

  return { parties: partiesMap, fiscalYearsById: fysById, existingInvoiceKeys, defaultVatRate };
}

export function buildExpenseFingerprint(
  companyId: string,
  data: ExpenseInput,
  fiscalYearId: string,
): ExpenseFingerprint {
  return {
    companyId,
    fiscalYearId,
    partyId: data.partyId,
    invoiceNumber: data.invoiceNumber ?? null,
    miti: data.miti,
    taxableAmount: data.taxableAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
  };
}

export async function loadExpenseReferences(
  companyId: string,
  data: ExpenseInput,
  defaultVatRate: string,
  preloaded?: PreloadedContext,
): Promise<{ context: ExpenseContext } | { error: string }> {
  let fiscalYear: typeof fiscalYears.$inferSelect;
  if (data.fiscalYearId) {
    if (preloaded) {
      fiscalYear = preloaded.fiscalYearsById.get(data.fiscalYearId)
        ?? (await db.select().from(fiscalYears).where(
            and(eq(fiscalYears.id, data.fiscalYearId), eq(fiscalYears.companyId, companyId)),
          ).limit(1))[0];
    } else {
      fiscalYear = (await db.select().from(fiscalYears).where(
        and(eq(fiscalYears.id, data.fiscalYearId), eq(fiscalYears.companyId, companyId)),
      ).limit(1))[0];
    }
    if (!fiscalYear) return { error: "Fiscal year not found" };
  } else {
    const resolved = await resolveFiscalYear(companyId, data.miti);
    if ("error" in resolved) return { error: resolved.error };
    fiscalYear = resolved.fiscalYear;
  }

  // Resolve party
  let party: typeof parties.$inferSelect | undefined;
  if (preloaded) {
    party = preloaded.parties.get(data.partyId);
  }
  if (!party) {
    party = (
      await db
        .select()
        .from(parties)
        .where(and(eq(parties.id, data.partyId), eq(parties.companyId, companyId)))
        .limit(1)
    )[0];
  }
  if (!party) return { error: "Party not found" };

  return {
    context: {
      fiscalYear,
      fiscalYearId: fiscalYear.id,
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

export async function prepareValidatedExpense(
  companyId: string,
  data: ExpenseInput,
  defaultVatRate: string,
  messages: DuplicateMessages,
  preloaded?: PreloadedContext,
): Promise<{ ok: true; prepared: PreparedExpense } | { ok: false; error: string }> {
  const references = await loadExpenseReferences(companyId, data, defaultVatRate, preloaded);
  if ("error" in references) return { ok: false, error: references.error };

  const { context } = references;
  const fingerprint = buildExpenseFingerprint(companyId, data, context.fiscalYearId);

  // Duplicate check: use preloaded keys when available, fall back to DB query
  if (preloaded && data.invoiceNumber) {
    const normalizedInvoice = String(data.invoiceNumber).trim().toLowerCase();
    const key = `${companyId}:${context.fiscalYearId}:${data.partyId}:${normalizedInvoice}`;
    if (preloaded.existingInvoiceKeys.has(key)) {
      return {
        ok: false,
        error: messages.duplicateInvoice,
      };
    }
  } else {
    const duplicate = await checkInvoiceDuplicate(fingerprint);
    if (duplicate) {
      return {
        ok: false,
        error:
          duplicate.level === "exact" ? messages.duplicateExact : messages.duplicateInvoice,
      };
    }
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
        fiscalYearId: context.fiscalYearId,
        partyId: data.partyId,
        categoryId: data.categoryId,
        locationId: data.locationId ?? context.party.locationId ?? null,
        truckId: data.truckId ?? null,
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
