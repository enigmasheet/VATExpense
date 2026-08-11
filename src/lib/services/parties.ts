import { db } from "@/lib/db";
import { parties } from "@/lib/db/schema";
import { normalizeName, normalizeVatNumber } from "@/lib/normalize";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { ServiceResult } from "./types";

export type Party = typeof parties.$inferSelect;

/**
 * Creates a party with duplicate detection for both name and VAT number.
 * The name duplicate check considers both normalizedName and normalizedVatNumber
 * to avoid false positives when two parties share a name but have different VAT numbers.
 */
export async function createParty(
  companyId: string,
  input: {
    name: string;
    vatNumber?: string | null;
    locationId?: string | null;
    isActive?: boolean;
  },
): Promise<ServiceResult<Party>> {
  const normalizedName = normalizeName(input.name);
  const normalizedVatNumber = normalizeVatNumber(input.vatNumber);

  const nameDup = (
    await db
      .select()
      .from(parties)
      .where(
        and(
          eq(parties.companyId, companyId),
          eq(parties.normalizedName, normalizedName),
          normalizedVatNumber === null
            ? isNull(parties.normalizedVatNumber)
            : eq(parties.normalizedVatNumber, normalizedVatNumber),
        ),
      )
      .limit(1)
  )[0];
  if (nameDup) return { ok: false, error: `Party "${input.name}" already exists` };

  if (normalizedVatNumber) {
    const vatDup = (
      await db
        .select()
        .from(parties)
        .where(
          and(
            eq(parties.companyId, companyId),
            eq(parties.normalizedVatNumber, normalizedVatNumber),
          ),
        )
        .limit(1)
    )[0];
    if (vatDup) return { ok: false, error: `VAT number already used by "${vatDup.name}"` };
  }

  const [created] = await db
    .insert(parties)
    .values({
      companyId,
      name: input.name,
      normalizedName,
      vatNumber: input.vatNumber ?? null,
      normalizedVatNumber,
      locationId: input.locationId ?? null,
      isActive: input.isActive,
    })
    .returning();

  return { ok: true, data: created };
}

/**
 * Updates a party by ID, scoped to a company. Normalizes name and sets updatedAt.
 */
export async function updateParty(
  id: string,
  companyId: string,
  changes: { name?: string; isActive?: boolean },
): Promise<ServiceResult<Party>> {
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
    .update(parties)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(and(eq(parties.id, id), eq(parties.companyId, companyId)))
    .returning();

  if (!updated) return { ok: false, error: "Party not found" };
  return { ok: true, data: updated };
}

/**
 * Deletes a party by ID, scoped to a company.
 */
export async function deleteParty(
  id: string,
  companyId: string,
): Promise<ServiceResult<{ id: string }>> {
  const [deleted] = await db
    .delete(parties)
    .where(and(eq(parties.id, id), eq(parties.companyId, companyId)))
    .returning();

  if (!deleted) return { ok: false, error: "Party not found" };
  return { ok: true, data: { id: deleted.id } };
}
