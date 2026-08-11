import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { normalizeName } from "@/lib/normalize";
import { and, eq, sql } from "drizzle-orm";
import type { ServiceResult } from "./types";

export type Location = typeof locations.$inferSelect;

/**
 * Creates a location with duplicate detection and normalized name.
 */
export async function createLocation(
  companyId: string,
  input: { name: string; isActive?: boolean },
): Promise<ServiceResult<Location>> {
  const normalizedName = normalizeName(input.name);

  const existing = (
    await db
      .select()
      .from(locations)
      .where(and(eq(locations.companyId, companyId), eq(locations.normalizedName, normalizedName)))
      .limit(1)
  )[0];
  if (existing) return { ok: false, error: `Location "${input.name}" already exists` };

  const [created] = await db
    .insert(locations)
    .values({
      companyId,
      name: input.name,
      normalizedName,
      isActive: input.isActive,
    })
    .returning();

  return { ok: true, data: created };
}

/**
 * Updates a location by ID, scoped to a company. Normalizes name and sets updatedAt.
 */
export async function updateLocation(
  id: string,
  companyId: string,
  changes: { name?: string; isActive?: boolean },
): Promise<ServiceResult<Location>> {
  const updates: Record<string, unknown> = {};
  if (changes.name !== undefined) {
    updates.name = changes.name;
    updates.normalizedName = normalizeName(changes.name);
  }
  if (changes.isActive !== undefined) updates.isActive = changes.isActive;

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  const [updated] = await db
    .update(locations)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(and(eq(locations.id, id), eq(locations.companyId, companyId)))
    .returning();

  if (!updated) return { ok: false, error: "Location not found" };
  return { ok: true, data: updated };
}

/**
 * Deletes a location by ID, scoped to a company.
 */
export async function deleteLocation(
  id: string,
  companyId: string,
): Promise<ServiceResult<{ id: string }>> {
  const [deleted] = await db
    .delete(locations)
    .where(and(eq(locations.id, id), eq(locations.companyId, companyId)))
    .returning();

  if (!deleted) return { ok: false, error: "Location not found" };
  return { ok: true, data: { id: deleted.id } };
}
