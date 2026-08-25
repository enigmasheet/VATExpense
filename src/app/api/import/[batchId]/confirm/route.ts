import { db } from "@/lib/db";
import { importBatches, importBatchRows, expenses, parties, categories, locations } from "@/lib/db/schema";
import { apiOk, badRequest, conflict, internalError, notFound, forbidden } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import {
  BATCH_STATUS_PENDING,
  BATCH_STATUS_CONFIRMED,
  BATCH_ROW_STATUS_VALID,
  BATCH_ROW_STATUS_CONFIRMED,
} from "@/lib/status-constants";

import { eq, inArray ,and} from "drizzle-orm";
import { normalizeItemName } from "@/lib/normalize-master-data";
import { normalizeMiti } from "@/lib/nepali-date";

export const runtime = "nodejs";

/**
 * Confirms a pending import batch and creates expense records for its valid rows.
 * Uses an atomic status claim to prevent double-confirm race conditions.
 * Re-validates that referenced masters still exist before inserting expenses.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    // Atomic claim: update status from pending → confirming to prevent race conditions
    const [claimed] = await db
      .update(importBatches)
      .set({ status: "confirming" })
      .where(and(eq(importBatches.id, batchId), eq(importBatches.status, BATCH_STATUS_PENDING)))
      .returning();

    if (!claimed) {
      // Check if batch exists at all
      const batch = (
        await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1)
      )[0];
      if (!batch) return notFound("Import batch not found");
      if (batch.companyId !== companyId) return forbidden("Access denied");
      // Status was not pending
      return conflict(`Batch is already ${batch.status}`);
    }

    if (claimed.companyId !== companyId) {
      // Rollback status claim — can't return 409 directly as we need to revert
      await db
        .update(importBatches)
        .set({ status: BATCH_STATUS_PENDING })
        .where(eq(importBatches.id, batchId));
      return forbidden("Access denied");
    }

    const rows = await db
      .select()
      .from(importBatchRows)
      .where(eq(importBatchRows.batchId, batchId))
      .orderBy(importBatchRows.rowIndex);

    const validRows = rows.filter((r) => r.status === BATCH_ROW_STATUS_VALID);

    if (validRows.length === 0) {
      await db
        .update(importBatches)
        .set({ status: BATCH_STATUS_PENDING })
        .where(eq(importBatches.id, batchId));
      return badRequest("No valid rows to import");
    }

    // Filter to rows that have all required resolved fields
    const importableRows = validRows.filter(
      (r) => r.resolvedPartyId && r.resolvedCategoryId && r.resolvedMiti && r.resolvedNepaliMonth,
    );

    const skippedCount = validRows.length - importableRows.length;

    // Re-validate: collect unique referenced master IDs and check they still exist
    const partyIds = [...new Set(importableRows.map((r) => r.resolvedPartyId!))];
    const categoryIds = [...new Set(importableRows.map((r) => r.resolvedCategoryId!))];
    const locationIds = [
      ...new Set(importableRows.map((r) => r.resolvedLocationId).filter(Boolean) as string[]),
    ];

    const [existingParties, existingCategories, existingLocations] = await Promise.all([
      db
        .select({ id: parties.id, locationId: parties.locationId })
        .from(parties)
        .where(and(inArray(parties.id, partyIds), eq(parties.companyId, companyId))),
      db
        .select({ id: categories.id })
        .from(categories)
        .where(and(inArray(categories.id, categoryIds), eq(categories.companyId, companyId))),
      locationIds.length > 0
        ? db
            .select({ id: locations.id })
            .from(locations)
            .where(and(inArray(locations.id, locationIds), eq(locations.companyId, companyId)))
        : Promise.resolve([]),
    ]);

    const validPartyIds = new Set(existingParties.map((p) => p.id));
    const validCategoryIds = new Set(existingCategories.map((c) => c.id));
    const validLocationIds = new Set(existingLocations.map((l) => l.id));
    const partyLocationMap = new Map(existingParties.map((p) => [p.id, p.locationId]));

    const importableRowsFinal = importableRows.filter((r) => {
      if (!validPartyIds.has(r.resolvedPartyId!) || !validCategoryIds.has(r.resolvedCategoryId!)) {
        return false;
      }
      if (r.resolvedLocationId && !validLocationIds.has(r.resolvedLocationId)) {
        return false;
      }
      return true;
    });

    const revalidationSkipped = importableRows.length - importableRowsFinal.length;

    const inserted = await db.transaction(async (tx) => {
      if (importableRowsFinal.length === 0) return [];

      // Batch insert all expenses at once, normalizing miti
      const expenseValues = importableRowsFinal.map((row) => {
        const partyLocationId = partyLocationMap.get(row.resolvedPartyId!) ?? null;
        return {
          companyId: claimed.companyId,
          fiscalYearId: claimed.fiscalYearId,
          partyId: row.resolvedPartyId!,
          categoryId: row.resolvedCategoryId!,
          locationId: row.resolvedLocationId ?? partyLocationId ?? undefined,
          miti: normalizeMiti(row.resolvedMiti!),
          nepaliMonth: row.resolvedNepaliMonth!,
          invoiceNumber: row.rawInvoiceNumber || undefined,
          item: normalizeItemName(row.rawItem as string),
          quantity: row.rawQuantity ? row.rawQuantity : undefined,
          rate: row.rawRate ? row.rawRate : undefined,
          taxableAmount: row.resolvedTaxableAmount as string,
          vatAmount: row.resolvedVatAmount as string,
          totalAmount: row.resolvedTotalAmount as string,
          vatRate: row.resolvedVatRate as string,
          remarks: row.rawRemarks || undefined,
        };
      });

      const results = await tx.insert(expenses).values(expenseValues).returning();

      // Batch update all confirmed rows at once
      const confirmedIds = importableRowsFinal.map((r) => r.id);
      if (confirmedIds.length > 0) {
        await tx
          .update(importBatchRows)
          .set({ status: BATCH_ROW_STATUS_CONFIRMED })
          .where(inArray(importBatchRows.id, confirmedIds));
      }

      // Mark skipped rows (those filtered out by revalidation)
      const skippedIds = importableRows
        .filter((r) => !importableRowsFinal.includes(r))
        .map((r) => r.id);
      if (skippedIds.length > 0) {
        await tx
          .update(importBatchRows)
          .set({ status: "error", errors: JSON.stringify(["Master record no longer valid"]) })
          .where(inArray(importBatchRows.id, skippedIds));
      }

      // Update batch status to confirmed
      await tx
        .update(importBatches)
        .set({ status: BATCH_STATUS_CONFIRMED })
        .where(eq(importBatches.id, batchId));

      return results;
    });

    return apiOk({
      data: {
        batchId: batchId,
        status: BATCH_STATUS_CONFIRMED,
        importedCount: inserted.length,
        skippedCount: skippedCount + revalidationSkipped,
      },
    });
  } catch (err) {
    console.error("POST /api/import/[batchId]/confirm failed", err);
    return internalError();
  }
}
