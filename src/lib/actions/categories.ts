"use server";

import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { createCategorySchema } from "@/lib/validation/masters";
import { normalizeName } from "@/lib/normalize";
import { safeParse } from "@/lib/validation/utils";
import { eq, and, sql } from "drizzle-orm";
import { requireCompanyId, type ActionResult } from "./common";

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
