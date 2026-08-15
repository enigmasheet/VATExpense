"use server";

import { db } from "@/lib/db";
import { expenses, companies } from "@/lib/db/schema";
import { expenseInputSchema, validateAmounts } from "@/lib/validation/expense";
import { safeParse } from "@/lib/validation/utils";
import { parseMiti } from "@/lib/nepali-date";
import { and, eq, sql } from "drizzle-orm";
import { requireCompanyId, type ActionResult } from "./common";
import { BATCH_SIZE_LIMIT } from "@/lib/constants";
import {
  ERR_NOT_AUTHENTICATED,
  ERR_COMPANY_NOT_FOUND,
  ERR_EXPENSE_NOT_FOUND,
  ERR_UNEXPECTED,
  ERR_VALIDATION_FAILED,
  ERR_DUPLICATE_IN_BATCH,
  ERR_OPTIMISTIC_CONFLICT,
  ERR_FAILED_TO_DELETE,
  ERR_FAILED_TO_UPDATE,
} from "@/lib/status-constants";
import {
  prepareValidatedExpense,
  type ExpenseInput,
} from "./expenses-helpers";

export type { ExpenseInput, ActionResult };

export interface ExpenseInputPayload {
  fiscalYearId: string;
  partyId: string;
  categoryId: string;
  locationId?: string | null;
  truckId?: string | null;
  miti: string;
  invoiceNumber?: string | null;
  item: string;
  quantity?: string | null;
  rate?: string | null;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatRate?: string;
  remarks?: string | null;
}

/**
 * Creates an expense for the authenticated user's company.
 *
 * @param input - The expense details to validate and save
 * @returns The created expense record with any duplicate or amount-validation warnings
 */
export async function createExpense(
  input: ExpenseInputPayload,
): Promise<ActionResult<typeof expenses.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  const payload = { ...input, companyId };
  const parsed = safeParse(expenseInputSchema, payload);
  if (!parsed.ok)
    return { ok: false, error: ERR_VALIDATION_FAILED, errors: parsed.errors };

  try {
    const company = (
      await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1)
    )[0];
    if (!company) return { ok: false, error: ERR_COMPANY_NOT_FOUND };

    const result = await prepareValidatedExpense(
      companyId,
      parsed.data,
      company.defaultVatRate,
      {
        duplicateExact:
          "This exact invoice has already been recorded for this party and fiscal year",
        duplicateInvoice:
          "An invoice with this number already exists for this party and fiscal year — review before saving",
        suspicious: (count) =>
          `${count} similar expense(s) already exist without an invoice number — possibly a duplicate`,
      },
    );
    if (!result.ok) return { ok: false, error: result.error };

    const { prepared } = result;
    const [created] = await db.insert(expenses).values(prepared.insert).returning();

    return {
      ok: true,
      data: created,
      warnings: prepared.warnings.length > 0 ? prepared.warnings : undefined,
    };
  } catch (err) {
    console.error("createExpense failed", err);
    return { ok: false, error: ERR_UNEXPECTED };
  }
}

/**
 * Batch save multiple expenses in a single database transaction.
 */
export interface BatchRowInput {
  miti: string;
  partyId: string;
  categoryId: string;
  locationId?: string | null;
  truckId?: string | null;
  invoiceNumber?: string | null;
  item: string;
  quantity?: string | null;
  rate?: string | null;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatRate?: string;
  remarks?: string | null;
}

export interface BatchRowResult {
  index: number;
  ok: boolean;
  id?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Saves multiple expenses while reporting validation and processing results for each input row.
 *
 * @param rows - Expense rows to validate and save, limited to 200 entries
 * @returns Per-row success or error results, including created IDs and warnings where applicable
 */
export async function batchSaveExpenses(
  rows: BatchRowInput[],
): Promise<ActionResult<BatchRowResult[]>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  if (rows.length === 0) return { ok: true, data: [] };
  if (rows.length > BATCH_SIZE_LIMIT)
    return { ok: false, error: `Batch size limited to ${BATCH_SIZE_LIMIT} rows` };

  try {
    const company = (
      await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1)
    )[0];
    if (!company) return { ok: false, error: ERR_COMPANY_NOT_FOUND };

    const results: BatchRowResult[] = [];
    const rowsToInsert: {
      data: typeof expenses.$inferInsert;
      index: number;
    }[] = [];

    // Track seen duplicates within the batch
    const seenInvoiceKeys = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const payload = { ...row, companyId };
      const parsed = safeParse(expenseInputSchema, payload);
      if (!parsed.ok) {
        results.push({ index: i, ok: false, error: parsed.errors.join("; ") });
        continue;
      }

      // Check within-batch duplicates
      if (parsed.data.invoiceNumber) {
        const key = `${parsed.data.partyId}:${parsed.data.invoiceNumber}`;
        if (seenInvoiceKeys.has(key)) {
          results.push({
            index: i,
            ok: false,
            error: ERR_DUPLICATE_IN_BATCH,
          });
          continue;
        }
        seenInvoiceKeys.add(key);
      }

      const prepared = await prepareValidatedExpense(
        companyId,
        parsed.data,
        company.defaultVatRate,
        {
          duplicateExact: "Exact duplicate already recorded",
          duplicateInvoice: "Invoice number already exists for this party — review",
          suspicious: (count) => `${count} similar expense(s) may be duplicates`,
        },
      );
      if (!prepared.ok) {
        results.push({ index: i, ok: false, error: prepared.error });
        continue;
      }

      rowsToInsert.push({ index: i, data: prepared.prepared.insert });

      results.push({
        index: i,
        ok: true,
        warnings:
          prepared.prepared.warnings.length > 0
            ? prepared.prepared.warnings
            : undefined,
      });
    }

    if (rowsToInsert.length === 0) {
      return { ok: true, data: results };
    }

    const inserted = await db
      .insert(expenses)
      .values(rowsToInsert.map((r) => r.data))
      .returning();

    for (let j = 0; j < rowsToInsert.length; j++) {
      const resultIdx = rowsToInsert[j].index;
      results[resultIdx].id = inserted[j].id;
    }

    return { ok: true, data: results };
  } catch (err) {
    console.error("batchSaveExpenses failed", err);
    return { ok: false, error: ERR_UNEXPECTED };
  }
}

/**
 * Soft-deletes an expense belonging to the authenticated user's company.
 *
 * @param id - The expense identifier
 * @returns The deleted expense identifier, or an error result if the user is unauthenticated, the expense is unavailable, or deletion fails.
 */
export async function deleteExpense(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  try {
    const current = (
      await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)))
        .limit(1)
    )[0];

    if (!current || current.isDeleted)
      return { ok: false, error: ERR_EXPENSE_NOT_FOUND };

    await db
      .update(expenses)
      .set({ isDeleted: true, deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)));

    return { ok: true, data: { id } };
  } catch (err) {
    console.error("deleteExpense failed", err);
    return { ok: false, error: ERR_FAILED_TO_DELETE };
  }
}

/**
 * Updates an existing expense with optimistic concurrency protection.
 *
 * @param id - The expense identifier
 * @param changes - The fields to update and the expected current row version
 * @returns The updated expense with any amount-validation warnings, or an error result
 */
export async function updateExpense(
  id: string,
  changes: Partial<ExpenseInputPayload> & { rowVersion: number },
): Promise<ActionResult<typeof expenses.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  try {
    const current = (
      await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)))
        .limit(1)
    )[0];

    if (!current || current.isDeleted)
      return { ok: false, error: ERR_EXPENSE_NOT_FOUND };

    if (current.rowVersion !== changes.rowVersion) {
      return {
        ok: false,
        error: ERR_OPTIMISTIC_CONFLICT,
      };
    }

    const values: Record<string, unknown> = {};

    if (changes.miti !== undefined) {
      const mitiParsed = parseMiti(changes.miti);
      if (!mitiParsed.ok)
        return { ok: false, error: `Invalid date: ${mitiParsed.error}` };
      values.miti = changes.miti;
      values.nepaliMonth = mitiParsed.monthName;
    }

    const patchKeys = [
      "fiscalYearId",
      "partyId",
      "categoryId",
      "locationId",
      "truckId",
      "invoiceNumber",
      "item",
      "quantity",
      "rate",
      "taxableAmount",
      "vatAmount",
      "totalAmount",
      "vatRate",
      "remarks",
    ] as const;

    for (const key of patchKeys) {
      if (key in changes) {
        values[key] = (changes as Record<string, unknown>)[key] ?? null;
      }
    }

    const merged = {
      quantity:
        values.quantity !== undefined
          ? (values.quantity as string)
          : current.quantity,
      rate: values.rate !== undefined ? (values.rate as string) : current.rate,
      taxableAmount:
        values.taxableAmount !== undefined
          ? (values.taxableAmount as string)
          : current.taxableAmount,
      vatAmount:
        values.vatAmount !== undefined
          ? (values.vatAmount as string)
          : current.vatAmount,
      totalAmount:
        values.totalAmount !== undefined
          ? (values.totalAmount as string)
          : current.totalAmount,
      vatRate:
        values.vatRate !== undefined
          ? (values.vatRate as string)
          : current.vatRate,
    };

    const warnings = validateAmounts(merged);

    const [updated] = await db
      .update(expenses)
      .set({
        ...values,
        rowVersion: current.rowVersion + 1,
        updatedAt: sql`now()`,
      })
      .where(
        and(eq(expenses.id, id), eq(expenses.rowVersion, current.rowVersion)),
      )
      .returning();

    if (!updated) {
      return {
        ok: false,
        error: ERR_OPTIMISTIC_CONFLICT,
      };
    }

    return {
      ok: true,
      data: updated,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    console.error("updateExpense failed", err);
    return { ok: false, error: ERR_FAILED_TO_UPDATE };
  }
}
