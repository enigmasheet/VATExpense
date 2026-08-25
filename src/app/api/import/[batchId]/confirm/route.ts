import { db } from "@/lib/db";
import { importBatches, importBatchRows, expenses, parties, categories, locations, fiscalYears } from "@/lib/db/schema";
import { apiOk, badRequest, conflict, internalError, notFound, forbidden } from "@/lib/api-response";
import { requireCompanyIdFromSession, getSessionUser } from "@/lib/api-auth";
import {
  BATCH_STATUS_PENDING,
  BATCH_STATUS_CONFIRMED,
  BATCH_ROW_STATUS_VALID,
  BATCH_ROW_STATUS_CONFIRMED,
} from "@/lib/status-constants";

import { eq, inArray, and } from "drizzle-orm";
import { normalizeItemName } from "@/lib/normalize-master-data";
import { normalizeMiti, parseMiti } from "@/lib/nepali-date";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const [claimed] = await db
      .update(importBatches)
      .set({ status: "confirming" })
      .where(and(eq(importBatches.id, batchId), eq(importBatches.status, BATCH_STATUS_PENDING)))
      .returning();

    if (!claimed) {
      const batch = (
        await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1)
      )[0];
      if (!batch) return notFound("Import batch not found");
      if (batch.companyId !== companyId) return forbidden("Access denied");
      return conflict(`Batch is already ${batch.status}`);
    }

    if (claimed.companyId !== companyId) {
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

    const importableRows = validRows.filter(
      (r) => r.resolvedPartyId && r.resolvedCategoryId && r.resolvedMiti && r.resolvedNepaliMonth,
    );

    const skippedCount = validRows.length - importableRows.length;

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

    const uniqueMitis = [...new Set(importableRowsFinal.map((r) => r.resolvedMiti!).filter(Boolean))];
    const fyRows = uniqueMitis.length > 0
      ? await db.select().from(fiscalYears).where(eq(fiscalYears.companyId, companyId))
      : [];
    const fyNameToId = new Map(fyRows.map((fy) => [fy.name, fy.id]));
    const mitiToFiscalYearId = new Map<string, string>();
    for (const miti of uniqueMitis) {
      const parsed = parseMiti(miti);
      if (parsed.ok) {
        mitiToFiscalYearId.set(miti, fyNameToId.get(parsed.fiscalYearName) ?? claimed.fiscalYearId);
      } else {
        mitiToFiscalYearId.set(miti, claimed.fiscalYearId);
      }
    }

    const rowsWithInvoice = importableRowsFinal.filter((r) => r.rawInvoiceNumber);
    const existingInvoiceMap = new Map<string, { partyId: string; invoiceNumber: string }>();

    if (rowsWithInvoice.length > 0) {
      const pairs = rowsWithInvoice.map((r) => ({
        partyId: r.resolvedPartyId!,
        invoiceNumber: String(r.rawInvoiceNumber).trim().toLowerCase(),
        fiscalYearId: mitiToFiscalYearId.get(r.resolvedMiti!) ?? claimed.fiscalYearId,
      }));
      const uniquePartyIds = [...new Set(pairs.map((p) => p.partyId))];
      const uniqueInvoices = [...new Set(pairs.map((p) => p.invoiceNumber))];
      const uniqueFyIds = [...new Set(pairs.map((p) => p.fiscalYearId))];

      const existingExpenses = await db
        .select({ partyId: expenses.partyId, invoiceNumber: expenses.invoiceNumber, fiscalYearId: expenses.fiscalYearId })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            eq(expenses.isDeleted, false),
            inArray(expenses.fiscalYearId, uniqueFyIds),
            inArray(expenses.partyId, uniquePartyIds),
            inArray(expenses.invoiceNumber, uniqueInvoices),
          ),
        );

      for (const e of existingExpenses) {
        if (e.invoiceNumber) {
          existingInvoiceMap.set(`${e.fiscalYearId}:${e.partyId}:${e.invoiceNumber}`, {
            partyId: e.partyId,
            invoiceNumber: e.invoiceNumber,
          });
        }
      }
    }

    const batchSeen = new Set<string>();
    const duplicateRowIds = new Set<string>();
    for (const row of importableRowsFinal) {
      if (!row.rawInvoiceNumber) continue;
      const normalizedInvoice = String(row.rawInvoiceNumber).trim().toLowerCase();
      const fyId = mitiToFiscalYearId.get(row.resolvedMiti!) ?? claimed.fiscalYearId;
      const key = `${fyId}:${row.resolvedPartyId!}:${normalizedInvoice}`;
      if (batchSeen.has(key) || existingInvoiceMap.has(key)) {
        duplicateRowIds.add(row.id);
      } else {
        batchSeen.add(key);
      }
    }

    const nonDuplicateRows = importableRowsFinal.filter((r) => !duplicateRowIds.has(r.id));
    const duplicateSkippedCount = duplicateRowIds.size;

    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id ?? null;

    const inserted = await db.transaction(async (tx) => {
      let results: typeof expenses.$inferSelect[] = [];

      if (nonDuplicateRows.length > 0) {
        const expenseValues = nonDuplicateRows.map((row) => {
          const partyLocationId = partyLocationMap.get(row.resolvedPartyId!) ?? null;
          const rawInvoice = row.rawInvoiceNumber
            ? String(row.rawInvoiceNumber).trim().toLowerCase() || undefined
            : undefined;
          return {
            companyId: claimed.companyId,
            fiscalYearId: mitiToFiscalYearId.get(row.resolvedMiti!) ?? claimed.fiscalYearId,
            partyId: row.resolvedPartyId!,
            categoryId: row.resolvedCategoryId!,
            locationId: row.resolvedLocationId ?? partyLocationId ?? undefined,
            miti: normalizeMiti(row.resolvedMiti!),
            nepaliMonth: row.resolvedNepaliMonth!,
            invoiceNumber: rawInvoice,
            item: normalizeItemName(row.rawItem as string),
            quantity: row.rawQuantity ? row.rawQuantity : undefined,
            rate: row.rawRate ? row.rawRate : undefined,
            taxableAmount: row.resolvedTaxableAmount as string,
            vatAmount: row.resolvedVatAmount as string,
            totalAmount: row.resolvedTotalAmount as string,
            vatRate: row.resolvedVatRate as string,
            remarks: row.rawRemarks || undefined,
            createdBy: userId,
            updatedBy: userId,
          };
        });

        results = await tx.insert(expenses).values(expenseValues).returning();

        const confirmedIds = nonDuplicateRows.map((r) => r.id);
        await tx
          .update(importBatchRows)
          .set({ status: BATCH_ROW_STATUS_CONFIRMED })
          .where(inArray(importBatchRows.id, confirmedIds));
      }

      if (duplicateRowIds.size > 0) {
        await tx
          .update(importBatchRows)
          .set({ status: "error", errors: JSON.stringify(["Duplicate invoice number (already exists or repeated in batch)"]) })
          .where(inArray(importBatchRows.id, [...duplicateRowIds]));
      }

      const skippedIds = importableRows
        .filter((r) => !importableRowsFinal.includes(r))
        .map((r) => r.id);
      if (skippedIds.length > 0) {
        await tx
          .update(importBatchRows)
          .set({ status: "error", errors: JSON.stringify(["Master record no longer valid"]) })
          .where(inArray(importBatchRows.id, skippedIds));
      }

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
        skippedCount: skippedCount + revalidationSkipped + duplicateSkippedCount,
      },
    });
  } catch (err) {
    console.error("POST /api/import/[batchId]/confirm failed", err);
    return internalError();
  }
}
