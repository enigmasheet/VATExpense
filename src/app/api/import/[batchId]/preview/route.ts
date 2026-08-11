import { db } from "@/lib/db";
import { importBatches, importBatchRows, parties, categories, locations } from "@/lib/db/schema";
import { apiOk, badRequest, internalError, notFound } from "@/lib/api-response";
import { parseMiti } from "@/lib/nepali-date";
import { normalizeName } from "@/lib/normalize";
import { and, eq } from "drizzle-orm";

/**
 * Previews a pending import batch by resolving imported values against active company records and reporting row validation results.
 *
 * @param request - The incoming HTTP request
 * @param params - Route parameters containing the import batch identifier
 * @returns The batch metadata and resolved import rows, or an error response when the batch is missing, no longer pending, or processing fails
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;

  try {
    const batch = (
      await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1)
    )[0];

    if (!batch) return notFound("Import batch not found");
    if (batch.status !== "pending") {
      return badRequest(`Batch is already ${batch.status}`);
    }

    const rows = await db
      .select()
      .from(importBatchRows)
      .where(eq(importBatchRows.batchId, batchId))
      .orderBy(importBatchRows.rowIndex);

    const [existingParties, existingCategories, existingLocations] = await Promise.all([
      db.select().from(parties).where(and(eq(parties.companyId, batch.companyId), eq(parties.isActive, true))),
      db.select().from(categories).where(and(eq(categories.companyId, batch.companyId), eq(categories.isActive, true))),
      db.select().from(locations).where(and(eq(locations.companyId, batch.companyId), eq(locations.isActive, true))),
    ]);

    const partyMap = new Map(existingParties.map((p) => [p.normalizedName, p]));
    const categoryMap = new Map(existingCategories.map((c) => [c.normalizedName, c]));
    const locationMap = new Map(existingLocations.map((l) => [l.normalizedName, l]));

    const resolvedRows = await Promise.all(
      rows.map(async (row) => {
        const errors: string[] = [];

        const partyNorm = normalizeName(row.rawPartyName ?? "");
        const party = partyMap.get(partyNorm);
        if (!party) {
          errors.push(`Party "${row.rawPartyName}" not found`);
        }

        const categoryNorm = normalizeName(row.rawCategoryName ?? "");
        const category = categoryMap.get(categoryNorm);
        if (!category) {
          errors.push(`Category "${row.rawCategoryName}" not found`);
        }

        // Resolve location if provided
        let resolvedLocationId: string | null = null;
        let resolvedLocationName: string | null = null;
        if (row.rawLocationName) {
          const locationNorm = normalizeName(row.rawLocationName);
          const location = locationMap.get(locationNorm);
          if (location) {
            resolvedLocationId = location.id;
            resolvedLocationName = location.name;
          }
        }

        const mitiResult = parseMiti(row.rawMiti ?? "");
        if (!mitiResult.ok) {
          errors.push(`Invalid miti: ${mitiResult.error}`);
        }

        const taxable = parseFloat(row.rawTaxableAmount ?? "0") || 0;
        const vat = parseFloat(row.rawVatAmount ?? "0") || 0;
        const total = parseFloat(row.rawTotalAmount ?? "0") || 0;

        if (taxable <= 0) errors.push("Taxable amount must be positive");
        if (vat < 0) errors.push("VAT amount cannot be negative");
        if (total <= 0) errors.push("Total amount must be positive");

        const status = errors.length > 0 ? "error" : "valid";

        await db
          .update(importBatchRows)
          .set({
            status,
            resolvedPartyId: party?.id ?? null,
            resolvedCategoryId: category?.id ?? null,
            resolvedLocationId: resolvedLocationId,
            resolvedMiti: mitiResult.ok ? row.rawMiti : null,
            resolvedNepaliMonth: mitiResult.ok ? mitiResult.monthName : null,
            resolvedTaxableAmount: String(taxable),
            resolvedVatAmount: String(vat),
            resolvedTotalAmount: String(total),
            resolvedVatRate: row.rawVatRate || "13",
            errors: errors.length > 0 ? JSON.stringify(errors) : null,
          })
          .where(eq(importBatchRows.id, row.id));

        return {
          id: row.id,
          rowIndex: row.rowIndex,
          status,
          raw: {
            miti: row.rawMiti,
            invoiceNumber: row.rawInvoiceNumber,
            partyName: row.rawPartyName,
            categoryName: row.rawCategoryName,
            item: row.rawItem,
            quantity: row.rawQuantity,
            rate: row.rawRate,
            taxableAmount: row.rawTaxableAmount,
            vatAmount: row.rawVatAmount,
            totalAmount: row.rawTotalAmount,
            remarks: row.rawRemarks,
          },
          resolved: {
            partyId: party?.id ?? null,
            partyName: party?.name ?? null,
            categoryId: category?.id ?? null,
            categoryName: category?.name ?? null,
            locationId: resolvedLocationId,
            locationName: resolvedLocationName,
            miti: mitiResult.ok ? row.rawMiti : null,
            nepaliMonth: mitiResult.ok ? mitiResult.monthName : null,
            taxableAmount: String(taxable),
            vatAmount: String(vat),
            totalAmount: String(total),
            vatRate: row.rawVatRate || "13",
          },
          errors,
        };
      }),
    );

    const errorCount = resolvedRows.filter((r) => r.status === "error").length;

    await db
      .update(importBatches)
      .set({ errorCount })
      .where(eq(importBatches.id, batchId));

    return apiOk({
      data: {
        batchId: batch.id,
        filename: batch.filename,
        status: batch.status,
        rowCount: batch.rowCount,
        errorCount,
        rows: resolvedRows,
      },
    });
  } catch (err) {
    console.error("GET /api/import/[batchId]/preview failed", err);
    return internalError();
  }
}
