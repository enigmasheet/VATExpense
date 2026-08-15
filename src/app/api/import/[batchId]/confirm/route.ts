import { db } from "@/lib/db";
import { importBatches, importBatchRows, expenses } from "@/lib/db/schema";
import { apiOk, badRequest, internalError, notFound, forbidden } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import {
  BATCH_STATUS_PENDING,
  BATCH_STATUS_CONFIRMED,
  BATCH_ROW_STATUS_VALID,
  BATCH_ROW_STATUS_CONFIRMED,
  RUNTIME_NODEJS,
} from "@/lib/status-constants";
import { eq, inArray } from "drizzle-orm";

export const runtime = RUNTIME_NODEJS;

/**
 * Confirms a pending import batch and creates expense records for its valid rows.
 *
 * @param request - The incoming request.
 * @param params - Route parameters containing the import batch identifier.
 * @returns The confirmed batch identifier, status, and number of imported expenses.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const batch = (
      await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1)
    )[0];

    if (!batch) return notFound("Import batch not found");
    if (batch.companyId !== companyId) return forbidden("Access denied");
    if (batch.status !== BATCH_STATUS_PENDING) {
      return badRequest(`Batch is already ${batch.status}`);
    }

    const rows = await db
      .select()
      .from(importBatchRows)
      .where(eq(importBatchRows.batchId, batchId))
      .orderBy(importBatchRows.rowIndex);

    const validRows = rows.filter((r) => r.status === BATCH_ROW_STATUS_VALID);

    if (validRows.length === 0) {
      return badRequest("No valid rows to import");
    }

    // Filter to rows that have all required resolved fields
    const importableRows = validRows.filter(
      (r) => r.resolvedPartyId && r.resolvedCategoryId && r.resolvedMiti && r.resolvedNepaliMonth,
    );

    const skippedCount = validRows.length - importableRows.length;

    const inserted = await db.transaction(async (tx) => {
      if (importableRows.length === 0) return [];

      // Batch insert all expenses at once
      const expenseValues = importableRows.map((row) => ({
        companyId: batch.companyId,
        fiscalYearId: batch.fiscalYearId,
        partyId: row.resolvedPartyId!,
        categoryId: row.resolvedCategoryId!,
        locationId: row.resolvedLocationId ?? undefined,
        miti: row.resolvedMiti!,
        nepaliMonth: row.resolvedNepaliMonth!,
        invoiceNumber: row.rawInvoiceNumber || undefined,
        item: row.rawItem as string,
        quantity: row.rawQuantity ? row.rawQuantity : undefined,
        rate: row.rawRate ? row.rawRate : undefined,
        taxableAmount: row.resolvedTaxableAmount as string,
        vatAmount: row.resolvedVatAmount as string,
        totalAmount: row.resolvedTotalAmount as string,
        vatRate: row.resolvedVatRate as string,
        remarks: row.rawRemarks || undefined,
      }));

      const results = await tx.insert(expenses).values(expenseValues).returning();

      // Batch update all confirmed rows at once
      const confirmedIds = importableRows.map((r) => r.id);
      await tx
        .update(importBatchRows)
        .set({ status: BATCH_ROW_STATUS_CONFIRMED })
        .where(inArray(importBatchRows.id, confirmedIds));

      // Update batch status
      await tx
        .update(importBatches)
        .set({ status: BATCH_STATUS_CONFIRMED })
        .where(eq(importBatches.id, batchId));

      return results;
    });

    return apiOk({
      data: {
        batchId: batch.id,
        status: BATCH_STATUS_CONFIRMED,
        importedCount: inserted.length,
        skippedCount: skippedCount ?? 0,
      },
    });
  } catch (err) {
    console.error("POST /api/import/[batchId]/confirm failed", err);
    return internalError();
  }
}
