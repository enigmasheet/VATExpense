import { db } from "@/lib/db";
import { importBatches, importBatchRows } from "@/lib/db/schema";
import { apiOk, badRequest, internalError, notFound, forbidden } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { BATCH_STATUS_PENDING } from "@/lib/status-constants";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";

const UPDATABLE_FIELDS = [
  "rawPartyName",
  "rawCategoryName",
  "rawMiti",
  "rawLocationName",
  "rawVatNumber",
  "rawItem",
  "rawInvoiceNumber",
] as const;

type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ batchId: string; rowId: string }> },
) {
  const { batchId, rowId } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const updates: Partial<Record<UpdatableField, string>> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (field in body && typeof body[field] === "string") {
      updates[field] = body[field] as string;
    }
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const batch = (
      await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1)
    )[0];

    if (!batch) return notFound("Import batch not found");
    if (batch.companyId !== companyId) return forbidden("Access denied");
    if (batch.status !== BATCH_STATUS_PENDING) {
      return badRequest(`Batch is already ${batch.status}`);
    }

    const row = (
      await db
        .select()
        .from(importBatchRows)
        .where(and(eq(importBatchRows.id, rowId), eq(importBatchRows.batchId, batchId)))
        .limit(1)
    )[0];

    if (!row) return notFound("Batch row not found");

    await db
      .update(importBatchRows)
      .set(updates)
      .where(eq(importBatchRows.id, rowId));

    return apiOk({ data: { id: rowId, ...updates } });
  } catch (err) {
    console.error("PATCH /api/import/[batchId]/rows/[rowId] failed", err);
    return internalError();
  }
}
