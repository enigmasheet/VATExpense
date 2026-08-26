"use server";

import { requireCompanyId, type ActionResult } from "./common";
import {
  createItemCategory as createItemCategoryService,
  updateItemCategory as updateItemCategoryService,
  deleteItemCategory as deleteItemCategoryService,
  listItemCategories as listItemCategoriesService,
  type ItemCategory,
  type ItemCategoryWithName,
} from "@/lib/services/item-categories";
import { ERR_NOT_AUTHENTICATED } from "@/lib/status-constants";

export type { ActionResult };
export type { ItemCategory };

export async function createItemCategory(input: {
  itemName: string;
  categoryId: string;
}): Promise<ActionResult<ItemCategory>> {
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch { return { ok: false, error: ERR_NOT_AUTHENTICATED }; }
  const result = await createItemCategoryService(companyId, input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function updateItemCategory(
  id: string,
  changes: { itemName?: string; categoryId?: string },
): Promise<ActionResult<ItemCategory>> {
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch { return { ok: false, error: ERR_NOT_AUTHENTICATED }; }
  const result = await updateItemCategoryService(id, companyId, changes);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function deleteItemCategory(id: string): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch { return { ok: false, error: ERR_NOT_AUTHENTICATED }; }
  const result = await deleteItemCategoryService(id, companyId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export async function getItemCategories(): Promise<ActionResult<ItemCategoryWithName[]>> {
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch { return { ok: false, error: ERR_NOT_AUTHENTICATED }; }
  const data = await listItemCategoriesService(companyId);
  return { ok: true, data };
}
