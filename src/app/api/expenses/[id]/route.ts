import { db } from "@/lib/db";
import { expenses, parties, categories, locations } from "@/lib/db/schema";
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
import { parseMiti } from "@/lib/nepali-date";
import { and, eq, sql, aliasedTable } from "drizzle-orm";
import { z } from "zod";

const locationAlias = aliasedTable(locations, "location");

const patchSchema = expenseInputSchema
  .partial()
  .omit({ companyId: true })
  .extend({
    rowVersion: z.coerce.number().int().min(1, "rowVersion is required"),
  });

async function findExpense(id: string, companyId: string) {
  return (
    await db
      .select({
        id: expenses.id,
        companyId: expenses.companyId,
        fiscalYearId: expenses.fiscalYearId,
        partyId: expenses.partyId,
        categoryId: expenses.categoryId,
        locationId: expenses.locationId,
        miti: expenses.miti,
        nepaliMonth: expenses.nepaliMonth,
        invoiceNumber: expenses.invoiceNumber,
        item: expenses.item,
        quantity: expenses.quantity,
        rate: expenses.rate,
        taxableAmount: expenses.taxableAmount,
        vatAmount: expenses.vatAmount,
        totalAmount: expenses.totalAmount,
        vatRate: expenses.vatRate,
        remarks: expenses.remarks,
        isDeleted: expenses.isDeleted,
        deletedAt: expenses.deletedAt,
        rowVersion: expenses.rowVersion,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        partyName: parties.name,
        categoryName: categories.name,
        locationName: locationAlias.name,
      })
      .from(expenses)
      .leftJoin(parties, eq(parties.id, expenses.partyId))
      .leftJoin(categories, eq(categories.id, expenses.categoryId))
      .leftJoin(locationAlias, eq(locationAlias.id, expenses.locationId))
      .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)))
      .limit(1)
  )[0];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const row = await findExpense(id, companyId);
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
    const current = await findExpense(id, companyId);
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
    const current = await findExpense(id, companyId);
    if (!current || current.isDeleted) return notFound("Expense not found");

    await db
      .update(expenses)
      .set({
        isDeleted: true,
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(expenses.id, id));

    return apiOk({ data: { id, isDeleted: true } });
  } catch (err) {
    console.error(`DELETE /api/expenses/${id} failed`, err);
    return internalError();
  }
}