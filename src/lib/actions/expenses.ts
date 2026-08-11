"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { expenses, companies, fiscalYears, parties } from "@/lib/db/schema";
import { expenseInputSchema, validateAmounts } from "@/lib/validation/expense";
import { safeParse } from "@/lib/validation/utils";
import { parseMiti } from "@/lib/nepali-date";
import {
  checkInvoiceDuplicate,
  findSuspiciousDuplicates,
} from "@/lib/expenses/duplicates";
import { and, eq, sql } from "drizzle-orm";

export interface ActionError {
  ok: false;
  error: string;
  errors?: string[];
}

export interface ActionOk<T> {
  ok: true;
  data: T;
  warnings?: string[];
}

export type ActionResult<T> = ActionOk<T> | ActionError;

async function requireCompanyId(): Promise<string> {
  const session = await auth();
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) throw new Error("Not authenticated");
  return companyId;
}

export interface ExpenseInput {
  fiscalYearId: string;
  partyId: string;
  categoryId: string;
  locationId?: string | null;
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
 * Create a single expense via Server Action.
 */
export async function createExpense(
  input: ExpenseInput,
): Promise<ActionResult<typeof expenses.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const payload = { ...input, companyId };
  const parsed = safeParse(expenseInputSchema, payload);
  if (!parsed.ok)
    return { ok: false, error: "Validation failed", errors: parsed.errors };

  const data = parsed.data;

  try {
    const company = (
      await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1)
    )[0];
    if (!company) return { ok: false, error: "Company not found" };

    const fiscalYear = (
      await db
        .select()
        .from(fiscalYears)
        .where(
          and(
            eq(fiscalYears.id, data.fiscalYearId),
            eq(fiscalYears.companyId, companyId),
          ),
        )
        .limit(1)
    )[0];
    if (!fiscalYear) return { ok: false, error: "Fiscal year not found" };

    const party = (
      await db
        .select()
        .from(parties)
        .where(
          and(eq(parties.id, data.partyId), eq(parties.companyId, companyId)),
        )
        .limit(1)
    )[0];
    if (!party) return { ok: false, error: "Party not found" };

    const vatRate = data.vatRate ?? company.defaultVatRate;

    const fingerprint = {
      companyId,
      fiscalYearId: data.fiscalYearId,
      partyId: data.partyId,
      invoiceNumber: data.invoiceNumber ?? null,
      miti: data.miti,
      taxableAmount: data.taxableAmount,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
    };

    const duplicate = await checkInvoiceDuplicate(fingerprint);
    if (duplicate) {
      return {
        ok: false,
        error:
          duplicate.level === "exact"
            ? "This exact invoice has already been recorded for this party and fiscal year"
            : "An invoice with this number already exists for this party and fiscal year — review before saving",
      };
    }

    const warnings: string[] = [];
    if (!data.invoiceNumber) {
      const suspicious = await findSuspiciousDuplicates(fingerprint);
      if (suspicious.length > 0) {
        warnings.push(
          `${suspicious.length} similar expense(s) already exist without an invoice number — possibly a duplicate`,
        );
      }
    }

    const toleranceWarnings = validateAmounts({
      quantity: data.quantity ?? null,
      rate: data.rate ?? null,
      taxableAmount: data.taxableAmount,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
      vatRate,
    });
    warnings.push(...toleranceWarnings);

    const miti = parseMiti(data.miti);
    if (!miti.ok) return { ok: false, error: `Invalid date: ${miti.error}` };

    const [created] = await db
      .insert(expenses)
      .values({
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
        vatRate,
        remarks: data.remarks ?? null,
      })
      .returning();

    return {
      ok: true,
      data: created,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    console.error("createExpense failed", err);
    return { ok: false, error: "An unexpected error occurred" };
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

export async function batchSaveExpenses(
  rows: BatchRowInput[],
): Promise<ActionResult<BatchRowResult[]>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  if (rows.length === 0) return { ok: true, data: [] };
  if (rows.length > 200)
    return { ok: false, error: "Batch size limited to 200 rows" };

  try {
    const company = (
      await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1)
    )[0];
    if (!company) return { ok: false, error: "Company not found" };

    const results: BatchRowResult[] = [];
    const rowsToInsert: {
      data: typeof expenses.$inferInsert;
      index: number;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const payload = { ...row, companyId };
      const parsed = safeParse(expenseInputSchema, payload);
      if (!parsed.ok) {
        results.push({ index: i, ok: false, error: parsed.errors.join("; ") });
        continue;
      }

      const data = parsed.data;
      const mitiParsed = parseMiti(data.miti);
      if (!mitiParsed.ok) {
        results.push({
          index: i,
          ok: false,
          error: `Invalid date: ${mitiParsed.error}`,
        });
        continue;
      }

      const fiscalYear = (
        await db
          .select()
          .from(fiscalYears)
          .where(
            and(
              eq(fiscalYears.id, data.fiscalYearId),
              eq(fiscalYears.companyId, companyId),
            ),
          )
          .limit(1)
      )[0];
      if (!fiscalYear) {
        results.push({ index: i, ok: false, error: "Fiscal year not found" });
        continue;
      }

      const party = (
        await db
          .select()
          .from(parties)
          .where(
            and(eq(parties.id, data.partyId), eq(parties.companyId, companyId)),
          )
          .limit(1)
      )[0];
      if (!party) {
        results.push({ index: i, ok: false, error: "Party not found" });
        continue;
      }

      const vatRate = data.vatRate ?? company.defaultVatRate;

      const fingerprint = {
        companyId,
        fiscalYearId: data.fiscalYearId,
        partyId: data.partyId,
        invoiceNumber: data.invoiceNumber ?? null,
        miti: data.miti,
        taxableAmount: data.taxableAmount,
        vatAmount: data.vatAmount,
        totalAmount: data.totalAmount,
      };

      const duplicate = await checkInvoiceDuplicate(fingerprint);
      if (duplicate) {
        results.push({
          index: i,
          ok: false,
          error:
            duplicate.level === "exact"
              ? "Exact duplicate already recorded"
              : "Invoice number already exists for this party — review",
        });
        continue;
      }

      const warnings: string[] = [];
      if (!data.invoiceNumber) {
        const suspicious = await findSuspiciousDuplicates(fingerprint);
        if (suspicious.length > 0) {
          warnings.push(
            `${suspicious.length} similar expense(s) may be duplicates`,
          );
        }
      }

      const toleranceWarnings = validateAmounts({
        quantity: data.quantity ?? null,
        rate: data.rate ?? null,
        taxableAmount: data.taxableAmount,
        vatAmount: data.vatAmount,
        totalAmount: data.totalAmount,
        vatRate,
      });
      warnings.push(...toleranceWarnings);

      rowsToInsert.push({
        index: i,
        data: {
          companyId,
          fiscalYearId: data.fiscalYearId,
          partyId: data.partyId,
          categoryId: data.categoryId,
          locationId: data.locationId ?? null,
          miti: data.miti,
          nepaliMonth: mitiParsed.monthName,
          invoiceNumber: data.invoiceNumber ?? null,
          item: data.item,
          quantity: data.quantity ?? null,
          rate: data.rate ?? null,
          taxableAmount: data.taxableAmount,
          vatAmount: data.vatAmount,
          totalAmount: data.totalAmount,
          vatRate,
          remarks: data.remarks ?? null,
        },
      });

      results.push({
        index: i,
        ok: true,
        warnings: warnings.length > 0 ? warnings : undefined,
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
    return { ok: false, error: "An unexpected error occurred" };
  }
}

/**
 * Soft-delete an expense via Server Action.
 */
export async function deleteExpense(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
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
      return { ok: false, error: "Expense not found" };

    await db
      .update(expenses)
      .set({ isDeleted: true, deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(expenses.id, id));

    return { ok: true, data: { id } };
  } catch (err) {
    console.error("deleteExpense failed", err);
    return { ok: false, error: "Failed to delete expense" };
  }
}

/**
 * Update an expense via Server Action.
 */
export async function updateExpense(
  id: string,
  changes: Partial<ExpenseInput> & { rowVersion: number },
): Promise<ActionResult<typeof expenses.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
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
      return { ok: false, error: "Expense not found" };

    if (current.rowVersion !== changes.rowVersion) {
      return {
        ok: false,
        error:
          "This expense was changed by someone else — refresh and try again",
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
        error:
          "This expense was changed by someone else — refresh and try again",
      };
    }

    return {
      ok: true,
      data: updated,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    console.error("updateExpense failed", err);
    return { ok: false, error: "Failed to update expense" };
  }
}
