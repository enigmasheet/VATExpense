"use server";

import { db } from "@/lib/db";
import { parties } from "@/lib/db/schema";
import { createPartySchema } from "@/lib/validation/masters";
import { normalizeName, normalizeVatNumber } from "@/lib/normalize";
import { safeParse } from "@/lib/validation/utils";
import { eq, and, sql } from "drizzle-orm";
import { requireCompanyId, type ActionResult } from "./common";

/**
 * Creates a company-scoped party after validating its details and enforcing unique name and VAT number values.
 *
 * @param input - The party name, optional VAT number, and optional location ID
 * @returns A success result containing the created party, or an error result
 */
export async function createParty(input: {
  name: string;
  vatNumber?: string | null;
  locationId?: string | null;
}): Promise<ActionResult<typeof parties.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = safeParse(createPartySchema, { ...input, companyId });
  if (!parsed.ok) return { ok: false, error: "Validation failed", errors: parsed.errors };

  const data = parsed.data;
  const normalizedName = normalizeName(data.name);
  const normalizedVat = normalizeVatNumber(data.vatNumber);

  try {
    const existing = (
      await db
        .select()
        .from(parties)
        .where(and(eq(parties.companyId, companyId), eq(parties.normalizedName, normalizedName)))
        .limit(1)
    )[0];
    if (existing) return { ok: false, error: `Party "${existing.name}" already exists` };

    if (normalizedVat) {
      const vatExisting = (
        await db
          .select()
          .from(parties)
          .where(
            and(
              eq(parties.companyId, companyId),
              eq(parties.normalizedVatNumber, normalizedVat),
            ),
          )
          .limit(1)
      )[0];
      if (vatExisting) return { ok: false, error: `VAT number already used by "${vatExisting.name}"` };
    }

    const [created] = await db
      .insert(parties)
      .values({
        companyId,
        name: data.name,
        normalizedName,
        vatNumber: data.vatNumber ?? null,
        normalizedVatNumber: normalizedVat,
        locationId: data.locationId ?? null,
      })
      .returning();

    return { ok: true, data: created };
  } catch (err) {
    console.error("createParty failed", err);
    return { ok: false, error: "Failed to create party" };
  }
}

/**
 * Updates a company-owned party's name and active status.
 *
 * @param id - The party identifier
 * @param changes - The party fields to update
 * @returns The updated party on success, or an error result if authentication, lookup, or database operations fail
 */
export async function updateParty(
  id: string,
  changes: { name?: string; isActive?: boolean },
): Promise<ActionResult<typeof parties.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const current = (
      await db
        .select()
        .from(parties)
        .where(and(eq(parties.id, id), eq(parties.companyId, companyId)))
        .limit(1)
    )[0];
    if (!current) return { ok: false, error: "Party not found" };

    const values: Record<string, unknown> = {};
    if (changes.name !== undefined) {
      values.name = changes.name;
      values.normalizedName = normalizeName(changes.name);
    }
    if (changes.isActive !== undefined) values.isActive = changes.isActive;

    const [updated] = await db
      .update(parties)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(parties.id, id))
      .returning();

    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateParty failed", err);
    return { ok: false, error: "Failed to update party" };
  }
}

/**
 * Deletes a party belonging to the authenticated user's company.
 *
 * @param id - The party ID
 * @returns The deleted party ID on success, or an error result
 */
export async function deleteParty(id: string): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    await db
      .delete(parties)
      .where(and(eq(parties.id, id), eq(parties.companyId, companyId)));
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("deleteParty failed", err);
    return { ok: false, error: "Failed to delete party" };
  }
}
