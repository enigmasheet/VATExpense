"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parties, categories, locations, fiscalYears } from "@/lib/db/schema";
import {
  createPartySchema,
  createCategorySchema,
  createLocationSchema,
  createFiscalYearSchema,
} from "@/lib/validation/masters";
import { normalizeName, normalizeVatNumber } from "@/lib/normalize";
import { safeParse } from "@/lib/validation/utils";
import { eq, and, sql } from "drizzle-orm";
import type { ActionOk, ActionError } from "./expenses";

type ActionResult<T> = ActionOk<T> | ActionError;

/**
 * Retrieves the authenticated user's company ID.
 *
 * @returns The authenticated user's company ID
 * @throws An error if the user is not authenticated or has no company ID
 */
async function requireCompanyId(): Promise<string> {
  const session = await auth();
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) throw new Error("Not authenticated");
  return companyId;
}

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

/**
 * Creates a company-scoped category.
 *
 * @param input - The category name to create.
 * @returns A success result containing the created category, or an error result if authentication, validation, duplication, or persistence fails.
 */

export async function createCategory(input: {
  name: string;
}): Promise<ActionResult<typeof categories.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = safeParse(createCategorySchema, { ...input, companyId });
  if (!parsed.ok) return { ok: false, error: "Validation failed", errors: parsed.errors };

  const normalizedName = normalizeName(parsed.data.name);

  try {
    const existing = (
      await db
        .select()
        .from(categories)
        .where(and(eq(categories.companyId, companyId), eq(categories.normalizedName, normalizedName)))
        .limit(1)
    )[0];
    if (existing) return { ok: false, error: `Category "${existing.name}" already exists` };

    const [created] = await db
      .insert(categories)
      .values({ companyId, name: parsed.data.name, normalizedName })
      .returning();

    return { ok: true, data: created };
  } catch (err) {
    console.error("createCategory failed", err);
    return { ok: false, error: "Failed to create category" };
  }
}

/**
 * Updates a company-owned category's name and active status.
 *
 * @param id - The category identifier
 * @param changes - The category fields to update
 * @returns The updated category, or an error result if the category cannot be found or updated
 */
export async function updateCategory(
  id: string,
  changes: { name?: string; isActive?: boolean },
): Promise<ActionResult<typeof categories.$inferSelect>> {
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
      .update(categories)
      .set({ ...values, updatedAt: sql`now()` })
      .where(and(eq(categories.id, id), eq(categories.companyId, companyId)))
      .returning();

    if (!updated) return { ok: false, error: "Category not found" };
    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateCategory failed", err);
    return { ok: false, error: "Failed to update category" };
  }
}

/**
 * Deletes a company-owned category.
 *
 * @param id - The category identifier
 * @returns A success result containing the deleted category identifier, or an error result
 */
export async function deleteCategory(id: string): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.companyId, companyId)));
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("deleteCategory failed", err);
    return { ok: false, error: "Failed to delete category" };
  }
}

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

/**
 * Creates a company-scoped fiscal year.
 *
 * Activating the new fiscal year deactivates the company's existing fiscal years.
 *
 * @param input - The fiscal year name, date range, and optional active state
 * @returns The created fiscal year on success, or an error result
 */

export async function createFiscalYear(input: {
  name: string;
  startYear: number;
  endYear: number;
  isActive?: boolean;
}): Promise<ActionResult<typeof fiscalYears.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = safeParse(createFiscalYearSchema, { ...input, companyId });
  if (!parsed.ok) return { ok: false, error: "Validation failed", errors: parsed.errors };

  const data = parsed.data;

  try {
    if (data.isActive) {
      await db
        .update(fiscalYears)
        .set({ isActive: false, updatedAt: sql`now()` })
        .where(eq(fiscalYears.companyId, companyId));
    }

    const [created] = await db
      .insert(fiscalYears)
      .values({
        companyId,
        name: data.name,
        startYear: data.startYear,
        endYear: data.endYear,
        isActive: data.isActive,
      })
      .returning();

    return { ok: true, data: created };
  } catch (err) {
    console.error("createFiscalYear failed", err);
    return { ok: false, error: "Failed to create fiscal year" };
  }
}

/**
 * Updates a company fiscal year and optionally changes its active status.
 *
 * @param id - The fiscal year identifier
 * @param changes - The fields to update
 * @returns The updated fiscal year, or an error result if the fiscal year cannot be updated
 */
export async function updateFiscalYear(
  id: string,
  changes: { name?: string; isActive?: boolean },
): Promise<ActionResult<typeof fiscalYears.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    if (changes.isActive) {
      await db
        .update(fiscalYears)
        .set({ isActive: false, updatedAt: sql`now()` })
        .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.isActive, true)));
    }

    const values: Record<string, unknown> = {};
    if (changes.name !== undefined) values.name = changes.name;
    if (changes.isActive !== undefined) values.isActive = changes.isActive;

    const [updated] = await db
      .update(fiscalYears)
      .set({ ...values, updatedAt: sql`now()` })
      .where(and(eq(fiscalYears.id, id), eq(fiscalYears.companyId, companyId)))
      .returning();

    if (!updated) return { ok: false, error: "Fiscal year not found" };
    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateFiscalYear failed", err);
    return { ok: false, error: "Failed to update fiscal year" };
  }
}

/**
 * Deletes a company-owned fiscal year.
 *
 * @param id - The fiscal year identifier
 * @returns The deleted fiscal year identifier on success, or an error result if deletion fails
 */
export async function deleteFiscalYear(id: string): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    await db
      .delete(fiscalYears)
      .where(and(eq(fiscalYears.id, id), eq(fiscalYears.companyId, companyId)));
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("deleteFiscalYear failed", err);
    return { ok: false, error: "Failed to delete fiscal year" };
  }
}
