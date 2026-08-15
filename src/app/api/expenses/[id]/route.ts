import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { expenseInputSchema, validateAmounts } from "@/lib/validation/expense";
import { safeParse } from "@/lib/validation/utils";
import {
  apiOk,
  badRequest,
  conflict,
  unprocessableEntity,
  notFound,
  internalError,
} from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { findExpenseById } from "@/lib/db-helpers/expenses";
import { parseMiti } from "@/lib/nepali-date";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

const patchSchema = expenseInputSchema
  .partial()
  .omit({ companyId: true })
  .extend({
    rowVersion: z.coerce.number().int().min(1, "rowVersion is required"),
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const row = await findExpenseById(id, companyId);
    if (!row || row.isDeleted) return notFound("Expense not found");
    return apiOk({ data: row });
  } catch (err) {
    console.error(`GET /api/expenses/${id} failed`, err);
    return internalError();
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(patchSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  const { rowVersion, ...changes } = parsed.data;

  try {
    const current = await findExpenseById(id, companyId);
    if (!current || current.isDeleted) return notFound("Expense not found");

    if (current.rowVersion !== rowVersion) {
      return conflict("This expense was changed by someone else — refresh and try again", {
        currentRowVersion: current.rowVersion,
        sentRowVersion: rowVersion,
      });
    }

    const values: Record<string, unknown> = {};

    const miti = changes.miti;
    if (miti !== undefined) {
      const parsedMiti = parseMiti(miti);
      if (!parsedMiti.ok) return unprocessableEntity("Invalid miti", [parsedMiti.error]);
      values.miti = miti;
      values.nepaliMonth = parsedMiti.monthName;
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
      if ((changes as Record<string, unknown>)[key] !== undefined) {
        values[key] = (changes as Record<string, unknown>)[key] ?? null;
      }
    }

    const merged = {
      quantity: values.quantity !== undefined ? (values.quantity as string) : current.quantity,
      rate: values.rate !== undefined ? (values.rate as string) : current.rate,
      taxableAmount:
        values.taxableAmount !== undefined
          ? (values.taxableAmount as string)
          : current.taxableAmount,
      vatAmount: values.vatAmount !== undefined ? (values.vatAmount as string) : current.vatAmount,
      totalAmount:
        values.totalAmount !== undefined ? (values.totalAmount as string) : current.totalAmount,
      vatRate: values.vatRate !== undefined ? (values.vatRate as string) : current.vatRate,
    };

    const warnings = validateAmounts(merged);

    const [updated] = await db
      .update(expenses)
      .set({
        ...values,
        rowVersion: current.rowVersion + 1,
        updatedAt: sql`now()`,
      })
      .where(and(eq(expenses.id, id), eq(expenses.rowVersion, current.rowVersion)))
      .returning();

    if (!updated) {
      return conflict("This expense was changed by someone else — refresh and try again", {
        currentRowVersion: current.rowVersion,
      });
    }

    return apiOk({ data: updated, warnings });
  } catch (err) {
    console.error(`PATCH /api/expenses/${id} failed`, err);
    return internalError();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const current = await findExpenseById(id, companyId);
    if (!current || current.isDeleted) return notFound("Expense not found");

    await db
      .update(expenses)
      .set({
        isDeleted: true,
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)));

    return apiOk({ data: { id, isDeleted: true } });
  } catch (err) {
    console.error(`DELETE /api/expenses/${id} failed`, err);
    return internalError();
  }
}
