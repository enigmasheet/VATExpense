import { db } from "@/lib/db";
import { expenses, categories, locations, trucks, fiscalYears, parties } from "@/lib/db/schema";
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
import { requireCompanyIdFromSession, getSessionUser, requireAdminRole } from "@/lib/api-auth";
import { findExpenseById } from "@/lib/db-helpers/expenses";
import { parseMiti, normalizeMiti } from "@/lib/nepali-date";
import { checkInvoiceDuplicate, findSuspiciousDuplicates } from "@/lib/expenses/duplicates";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

const patchSchema = expenseInputSchema
  .partial()
  .omit({ companyId: true })
  .extend({
    rowVersion: z.coerce.number().int().min(1, "rowVersion is required"),
  });

const deleteSchema = z.object({
  rowVersion: z.coerce.number().int().min(1, "rowVersion is required").optional(),
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

  const adminOrError = await requireAdminRole();
  if (adminOrError instanceof Response) return adminOrError;

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

    const user = await getSessionUser();
    const userId = user?.id;

    const values: Record<string, unknown> = {};

    const miti = changes.miti;
    if (miti !== undefined) {
      const parsedMiti = parseMiti(miti);
      if (!parsedMiti.ok) return unprocessableEntity("Invalid miti", [parsedMiti.error]);
      values.miti = normalizeMiti(miti);
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


    // Validate FK ownership for any referenced entities being changed
    const fkChecks: Promise<{ id: string } | undefined>[] = [];
    if (values.fiscalYearId !== undefined && values.fiscalYearId !== null) {
      fkChecks.push(
        db.select({ id: fiscalYears.id }).from(fiscalYears).where(and(eq(fiscalYears.id, values.fiscalYearId as string), eq(fiscalYears.companyId, companyId))).limit(1).then((r) => r[0])
      );
    }
    if (values.partyId !== undefined && values.partyId !== null) {
      fkChecks.push(
        db.select({ id: parties.id }).from(parties).where(and(eq(parties.id, values.partyId as string), eq(parties.companyId, companyId))).limit(1).then((r) => r[0])
      );
    }
    if (values.categoryId !== undefined && values.categoryId !== null) {
      fkChecks.push(
        db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, values.categoryId as string), eq(categories.companyId, companyId))).limit(1).then((r) => r[0])
      );
    }
    if (values.locationId !== undefined && values.locationId !== null) {
      fkChecks.push(
        db.select({ id: locations.id }).from(locations).where(and(eq(locations.id, values.locationId as string), eq(locations.companyId, companyId))).limit(1).then((r) => r[0])
      );
    }
    if (values.truckId !== undefined && values.truckId !== null) {
      fkChecks.push(
        db.select({ id: trucks.id }).from(trucks).where(and(eq(trucks.id, values.truckId as string), eq(trucks.companyId, companyId))).limit(1).then((r) => r[0])
      );
    }
    if (fkChecks.length > 0) {
      const fkResults = await Promise.all(fkChecks);
      if (fkResults.some((r) => !r)) {
        return badRequest("One or more referenced entities (fiscal year, party, category, location, truck) not found for this company");
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

    // Duplicate detection on PATCH (check if the updated expense would match another)
    const effectiveFiscalYearId = (values.fiscalYearId as string) ?? current.fiscalYearId;
    const effectivePartyId = (values.partyId as string) ?? current.partyId;
    const effectiveInvoiceNumber = (values.invoiceNumber as string | null) ?? current.invoiceNumber;
    const effectiveMiti = (values.miti as string) ?? current.miti;

    // Verify the miti falls inside the effective fiscal year
    if (values.miti !== undefined || values.fiscalYearId !== undefined) {
      const parsedMiti = parseMiti(effectiveMiti);
      if (parsedMiti.ok) {
        const [fy] = await db
          .select({ startYear: fiscalYears.startYear })
          .from(fiscalYears)
          .where(eq(fiscalYears.id, effectiveFiscalYearId))
          .limit(1);
        if (fy && parsedMiti.fiscalYear !== fy.startYear) {
          return badRequest(
            `Date ${effectiveMiti} belongs to fiscal year ${parsedMiti.fiscalYearName}, not the selected fiscal year`,
          );
        }
      }
    }

    const fingerprint = {
      companyId,
      fiscalYearId: effectiveFiscalYearId,
      partyId: effectivePartyId,
      invoiceNumber: effectiveInvoiceNumber,
      miti: effectiveMiti,
      taxableAmount: merged.taxableAmount,
      vatAmount: merged.vatAmount,
      totalAmount: merged.totalAmount,
    };

    // Skip duplicate check if nothing that affects duplicates changed
    const affectsDuplicates =
      values.fiscalYearId !== undefined ||
      values.partyId !== undefined ||
      values.invoiceNumber !== undefined ||
      values.miti !== undefined ||
      values.taxableAmount !== undefined ||
      values.vatAmount !== undefined ||
      values.totalAmount !== undefined;

    if (affectsDuplicates) {
      const duplicate = await checkInvoiceDuplicate(fingerprint, id);
      if (duplicate) {
        return conflict(
          duplicate.level === "exact"
            ? "This exact invoice has already been recorded for this party and fiscal year"
            : "An invoice with this number already exists for this party and fiscal year — review before saving",
          { duplicateLevel: duplicate.level, existing: duplicate.existing },
        );
      }

      if (!effectiveInvoiceNumber) {
        const suspicious = await findSuspiciousDuplicates(fingerprint, id);
        if (suspicious.length > 0) {
          warnings.push(
            `${suspicious.length} similar expense(s) already exist without an invoice number — possibly a duplicate`,
          );
        }
      }
    }

    const [updated] = await db
      .update(expenses)
      .set({
        ...values,
        updatedBy: userId ?? null,
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

  const adminOrError = await requireAdminRole();
  if (adminOrError instanceof Response) return adminOrError;

  let body: unknown = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = await request.json();
    }
  } catch {
    // ignore parse errors for DELETE with no body
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join("; "));

  try {
    const current = await findExpenseById(id, companyId);
    if (!current || current.isDeleted) return notFound("Expense not found");

    // Optimistic concurrency check if rowVersion provided
    if (parsed.data.rowVersion !== undefined && current.rowVersion !== parsed.data.rowVersion) {
      return conflict("This expense was changed by someone else — refresh and try again", {
        currentRowVersion: current.rowVersion,
        sentRowVersion: parsed.data.rowVersion,
      });
    }

    const result = await db
      .update(expenses)
      .set({
        isDeleted: true,
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(expenses.id, id),
          eq(expenses.companyId, companyId),
          eq(expenses.rowVersion, current.rowVersion),
        ),
      )
      .returning();

    if (!result.length) {
      return conflict("This expense was changed by someone else — refresh and try again", {
        currentRowVersion: current.rowVersion,
      });
    }

    return apiOk({ data: { id, isDeleted: true } });
  } catch (err) {
    console.error(`DELETE /api/expenses/${id} failed`, err);
    return internalError();
  }
}
