"use server";

import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { createLocationSchema } from "@/lib/validation/masters";
import { normalizeName } from "@/lib/normalize";
import { safeParse } from "@/lib/validation/utils";
import { eq, and, sql } from "drizzle-orm";
import { requireCompanyId, type ActionResult } from "./common";

/**
 * Creates a company-scoped location.
 *
 * @param input - The location name
 * @returns The created location record
 */
export async function createLocation(input: {
  name: string;
}): Promise<ActionResult<typeof locations.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = safeParse(createLocationSchema, { ...input, companyId });
  if (!parsed.ok) return { ok: false, error: "Validation failed", errors: parsed.errors };

  const normalizedName = normalizeName(parsed.data.name);

  try {
    const existing = (
      await db
        .select()
        .from(locations)
        .where(and(eq(locations.companyId, companyId), eq(locations.normalizedName, normalizedName)))
        .limit(1)
    )[0];
    if (existing) return { ok: false, error: `Location "${existing.name}" already exists` };

    const [created] = await db
      .insert(locations)
      .values({ companyId, name: parsed.data.name, normalizedName })
      .returning();

    return { ok: true, data: created };
  } catch (err) {
    console.error("createLocation failed", err);
    return { ok: false, error: "Failed to create location" };
  }
}

/**
 * Updates a company-owned location.
 *
 * @param id - The location identifier
 * @param changes - The location name or active status to update
 * @returns The updated location on success, or an error result if the location cannot be updated
 */
export async function updateLocation(
  id: string,
  changes: { name?: string; isActive?: boolean },
): Promise<ActionResult<typeof locations.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const values: Record<string, unknown> = {};
    if (changes.name !== undefined) {
      values.name = changes.name;
      values.normalizedName = normalizeName(changes.name);
    }
    if (changes.isActive !== undefined) values.isActive = changes.isActive;

    const [updated] = await db
      .update(locations)
      .set({ ...values, updatedAt: sql`now()` })
      .where(and(eq(locations.id, id), eq(locations.companyId, companyId)))
      .returning();

    if (!updated) return { ok: false, error: "Location not found" };
    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateLocation failed", err);
    return { ok: false, error: "Failed to update location" };
  }
}

/**
 * Deletes a company-owned location.
 *
 * @param id - The location identifier
 * @returns The deleted location identifier on success, or an error result
 */
export async function deleteLocation(id: string): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    await db
      .delete(locations)
      .where(and(eq(locations.id, id), eq(locations.companyId, companyId)));
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("deleteLocation failed", err);
    return { ok: false, error: "Failed to delete location" };
  }
}
