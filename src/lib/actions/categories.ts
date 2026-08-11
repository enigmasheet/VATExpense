"use server";

import { requireCompanyId, type ActionResult } from "./common";
import { createCategory as createCategoryService, updateCategory as updateCategoryService, deleteCategory as deleteCategoryService, type Category } from "@/lib/services/categories";

export type { ActionResult };

/**
 * Creates a company-scoped category.
 *
 * @param input - The category name to create.
 * @returns A success result containing the created category, or an error result if authentication, validation, duplication, or persistence fails.
 */
export async function createCategory(input: {
  name: string;
}): Promise<ActionResult<Category>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const result = await createCategoryService(companyId, input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
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
): Promise<ActionResult<Category>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const result = await updateCategoryService(id, companyId, changes);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
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

  const result = await deleteCategoryService(id, companyId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
