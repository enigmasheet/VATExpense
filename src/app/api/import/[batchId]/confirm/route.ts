import { db } from "@/lib/db";
import { importBatches, importBatchRows, expenses } from "@/lib/db/schema";
import { apiOk, badRequest, internalError, notFound } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export async function POST(
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

    const validRows = rows.filter((r) => r.status === "valid");

    if (validRows.length === 0) {
      return badRequest("No valid rows to import");
    }

    const inserted = await db.transaction(async (tx) => {
      const results = [];
      for (const row of validRows) {
        const [expense] = await tx
          .insert(expenses)
          .values({
            companyId: batch.companyId,
            fiscalYearId: batch.fiscalYearId,
            partyId: row.resolvedPartyId as string,
            categoryId: row.resolvedCategoryId as string,
            locationId: row.resolvedLocationId ?? undefined,
            miti: row.resolvedMiti as string,
            nepaliMonth: row.resolvedNepaliMonth as string,
            invoiceNumber: row.rawInvoiceNumber || undefined,
            item: row.rawItem as string,
            quantity: row.rawQuantity ? row.rawQuantity : undefined,
            rate: row.rawRate ? row.rawRate : undefined,
            taxableAmount: row.resolvedTaxableAmount as string,
            vatAmount: row.resolvedVatAmount as string,
            totalAmount: row.resolvedTotalAmount as string,
            vatRate: row.resolvedVatRate as string,
            remarks: row.rawRemarks || undefined,
          })
          .returning();

        results.push(expense);

        await tx
          .update(importBatchRows)
          .set({ status: "confirmed" })
          .where(eq(importBatchRows.id, row.id));
      }

      await tx
        .update(importBatches)
        .set({ status: "confirmed" })
        .where(eq(importBatches.id, batchId));

      return results;
    });

    return apiOk({
      data: {
        batchId: batch.id,
        status: "confirmed",
        importedCount: inserted.length,
      },
    });
  } catch (err) {
    console.error("POST /api/import/[batchId]/confirm failed", err);
    return internalError();
  }
}
