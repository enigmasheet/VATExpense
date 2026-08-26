import { db } from "@/lib/db";
import { truckDocuments, trucks } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import type { ServiceResult } from "./types";

export type TruckDocument = typeof truckDocuments.$inferSelect;

export async function listTruckDocuments(
  companyId: string,
  truckId: string,
): Promise<TruckDocument[]> {
  return db
    .select()
    .from(truckDocuments)
    .where(and(eq(truckDocuments.companyId, companyId), eq(truckDocuments.truckId, truckId)))
    .orderBy(desc(truckDocuments.createdAt));
}

export async function createTruckDocument(
  companyId: string,
  input: {
    truckId: string;
    documentType: string;
    documentNumber?: string | null;
    expiryDate?: string | null;
    reminderDate?: string | null;
  },
): Promise<ServiceResult<TruckDocument>> {
  const [truck] = await db
    .select({ id: trucks.id })
    .from(trucks)
    .where(and(eq(trucks.id, input.truckId), eq(trucks.companyId, companyId)))
    .limit(1);
  if (!truck) return { ok: false, error: "Truck not found for this company" };

  const [created] = await db
    .insert(truckDocuments)
    .values({
      companyId,
      truckId: input.truckId,
      documentType: input.documentType,
      documentNumber: input.documentNumber ?? null,
      expiryDate: input.expiryDate ?? null,
      reminderDate: input.reminderDate ?? null,
    })
    .returning();
  return { ok: true, data: created };
}

export async function updateTruckDocument(
  id: string,
  companyId: string,
  changes: {
    documentType?: string;
    documentNumber?: string | null;
    expiryDate?: string | null;
    reminderDate?: string | null;
    isActive?: boolean;
  },
): Promise<ServiceResult<TruckDocument>> {
  const updates: Record<string, unknown> = {};
  if (changes.documentType !== undefined) updates.documentType = changes.documentType;
  if (changes.documentNumber !== undefined) updates.documentNumber = changes.documentNumber;
  if (changes.expiryDate !== undefined) updates.expiryDate = changes.expiryDate;
  if (changes.reminderDate !== undefined) updates.reminderDate = changes.reminderDate;
  if (changes.isActive !== undefined) updates.isActive = changes.isActive;
  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  const [updated] = await db
    .update(truckDocuments)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(and(eq(truckDocuments.id, id), eq(truckDocuments.companyId, companyId)))
    .returning();
  if (!updated) return { ok: false, error: "Truck document not found" };
  return { ok: true, data: updated };
}

export async function deleteTruckDocument(
  id: string,
  companyId: string,
): Promise<ServiceResult<{ id: string }>> {
  const [deleted] = await db
    .delete(truckDocuments)
    .where(and(eq(truckDocuments.id, id), eq(truckDocuments.companyId, companyId)))
    .returning();
  if (!deleted) return { ok: false, error: "Truck document not found" };
  return { ok: true, data: { id: deleted.id } };
}
