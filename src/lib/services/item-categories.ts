import { db } from "@/lib/db";
import { itemCategories, categories } from "@/lib/db/schema";
import { normalizeName } from "@/lib/normalize";
import { and, eq, asc, sql } from "drizzle-orm";
import { isUniqueViolation } from "@/lib/api-response";
import type { ServiceResult } from "./types";

export type ItemCategory = typeof itemCategories.$inferSelect;

export interface ItemCategoryWithName {
  id: string;
  itemName: string;
  categoryId: string;
  categoryName: string | null;
}

export async function listItemCategories(
  companyId: string,
): Promise<ItemCategoryWithName[]> {
  return db
    .select({
      id: itemCategories.id,
      itemName: itemCategories.itemName,
      categoryId: itemCategories.categoryId,
      categoryName: categories.name,
    })
    .from(itemCategories)
    .leftJoin(categories, eq(categories.id, itemCategories.categoryId))
    .where(eq(itemCategories.companyId, companyId))
    .orderBy(asc(itemCategories.itemName));
}

export async function createItemCategory(
  companyId: string,
  input: { itemName: string; categoryId: string },
): Promise<ServiceResult<ItemCategory>> {
  const normalizedItemName = normalizeName(input.itemName);
  const existing = (
    await db
      .select()
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.companyId, companyId),
          eq(itemCategories.normalizedItemName, normalizedItemName),
        ),
      )
      .limit(1)
  )[0];
  if (existing) {
    return { ok: false, error: `Item "${input.itemName}" is already linked to a category` };
  }

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, input.categoryId), eq(categories.companyId, companyId)))
    .limit(1);
  if (!category) {
    return { ok: false, error: "Category not found for this company" };
  }

  try {
    const [created] = await db
      .insert(itemCategories)
      .values({
        companyId,
        itemName: input.itemName,
        normalizedItemName,
        categoryId: input.categoryId,
      })
      .returning();
    return { ok: true, data: created };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: "This item already has a category link" };
    }
    throw err;
  }
}

export async function updateItemCategory(
  id: string,
  companyId: string,
  changes: { itemName?: string; categoryId?: string },
): Promise<ServiceResult<ItemCategory>> {
  const updates: Record<string, unknown> = {};
  if (changes.itemName !== undefined) {
    updates.itemName = changes.itemName;
    updates.normalizedItemName = normalizeName(changes.itemName);
  }
  if (changes.categoryId !== undefined) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, changes.categoryId), eq(categories.companyId, companyId)))
      .limit(1);
    if (!category) {
      return { ok: false, error: "Category not found for this company" };
    }
    updates.categoryId = changes.categoryId;
  }
  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  try {
    const [updated] = await db
      .update(itemCategories)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(and(eq(itemCategories.id, id), eq(itemCategories.companyId, companyId)))
      .returning();
    if (!updated) return { ok: false, error: "Item category link not found" };
    return { ok: true, data: updated };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: "Another link with this item name already exists" };
    }
    throw err;
  }
}

export async function deleteItemCategory(
  id: string,
  companyId: string,
): Promise<ServiceResult<{ id: string }>> {
  const [deleted] = await db
    .delete(itemCategories)
    .where(and(eq(itemCategories.id, id), eq(itemCategories.companyId, companyId)))
    .returning();
  if (!deleted) return { ok: false, error: "Item category link not found" };
  return { ok: true, data: { id: deleted.id } };
}
