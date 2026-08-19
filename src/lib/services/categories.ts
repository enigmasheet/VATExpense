import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { normalizeName } from "@/lib/normalize";
import { and, eq, sql } from "drizzle-orm";
import { isUniqueViolation } from "@/lib/api-response";
import type { ServiceResult } from "./types";

export type Category = typeof categories.$inferSelect;

/**
 * Creates a category with duplicate detection and normalized name.
 */
export async function createCategory(
  companyId: string,
  input: { name: string; isActive?: boolean },
): Promise<ServiceResult<Category>> {
  const normalizedName = normalizeName(input.name);

  const existing = (
    await db
      .select()
      .from(categories)
      .where(and(eq(categories.companyId, companyId), eq(categories.normalizedName, normalizedName)))
      .limit(1)
  )[0];
  if (existing) return { ok: false, error: `Category "${input.name}" already exists` };

  try {
    const [created] = await db
      .insert(categories)
      .values({
        companyId,
        name: input.name,
        normalizedName,
        isActive: input.isActive,
      })
      .returning();

    return { ok: true, data: created };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `A category with this name already exists` };
    }
    throw err;
  }
}

/**
 * Updates a category by ID, scoped to a company. Normalizes name and sets updatedAt.
 */
export async function updateCategory(
  id: string,
  companyId: string,
  changes: { name?: string; isActive?: boolean },
): Promise<ServiceResult<Category>> {
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
    .update(categories)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(and(eq(categories.id, id), eq(categories.companyId, companyId)))
    .returning();

  if (!updated) return { ok: false, error: "Category not found" };
  return { ok: true, data: updated };
}

/**
 * Deletes a category by ID, scoped to a company.
 */
export async function deleteCategory(
  id: string,
  companyId: string,
): Promise<ServiceResult<{ id: string }>> {
  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.companyId, companyId)))
    .returning();

  if (!deleted) return { ok: false, error: "Category not found" };
  return { ok: true, data: { id: deleted.id } };
}
