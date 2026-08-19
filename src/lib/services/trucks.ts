import { db } from "@/lib/db";
import { trucks } from "@/lib/db/schema";
import { normalizeName } from "@/lib/normalize";
import { and, eq, sql } from "drizzle-orm";
import { isUniqueViolation } from "@/lib/api-response";
import type { ServiceResult } from "./types";

export type Truck = typeof trucks.$inferSelect;

/**
 * Creates a truck with duplicate detection and normalized name.
 */
export async function createTruck(
  companyId: string,
  input: { name: string; ownerName?: string | null; truckType?: string | null; isActive?: boolean },
): Promise<ServiceResult<Truck>> {
  const normalizedName = normalizeName(input.name);

  const existing = (
    await db
      .select()
      .from(trucks)
      .where(and(eq(trucks.companyId, companyId), eq(trucks.normalizedName, normalizedName)))
      .limit(1)
  )[0];
  if (existing) return { ok: false, error: `Truck "${input.name}" already exists` };

  try {
    const [created] = await db
      .insert(trucks)
      .values({
        companyId,
        name: input.name,
        normalizedName,
        ownerName: input.ownerName ?? null,
        truckType: input.truckType ?? null,
        isActive: input.isActive,
      })
      .returning();

    return { ok: true, data: created };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `A truck with this name already exists` };
    }
    throw err;
  }
}

/**
 * Updates a truck by ID, scoped to a company. Normalizes name and sets updatedAt.
 */
export async function updateTruck(
  id: string,
  companyId: string,
  changes: { name?: string; ownerName?: string | null; truckType?: string | null; isActive?: boolean },
): Promise<ServiceResult<Truck>> {
  const updates: Record<string, unknown> = {};
  if (changes.name !== undefined) {
    updates.name = changes.name;
    updates.normalizedName = normalizeName(changes.name);
  }
  if (changes.ownerName !== undefined) updates.ownerName = changes.ownerName;
  if (changes.truckType !== undefined) updates.truckType = changes.truckType;
  if (changes.isActive !== undefined) updates.isActive = changes.isActive;

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  const [updated] = await db
    .update(trucks)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(and(eq(trucks.id, id), eq(trucks.companyId, companyId)))
    .returning();

  if (!updated) return { ok: false, error: "Truck not found" };
  return { ok: true, data: updated };
}

/**
 * Deletes a truck by ID, scoped to a company.
 */
export async function deleteTruck(
  id: string,
  companyId: string,
): Promise<ServiceResult<{ id: string }>> {
  const [deleted] = await db
    .delete(trucks)
    .where(and(eq(trucks.id, id), eq(trucks.companyId, companyId)))
    .returning();

  if (!deleted) return { ok: false, error: "Truck not found" };
  return { ok: true, data: { id: deleted.id } };
}
