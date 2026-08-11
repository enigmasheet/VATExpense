"use server";

import { requireCompanyId, type ActionResult } from "./common";
import { createLocation as createLocationService, updateLocation as updateLocationService, deleteLocation as deleteLocationService, type Location } from "@/lib/services/locations";

export type { ActionResult };

/**
 * Creates a company-scoped location.
 *
 * @param input - The location name
 * @returns The created location record
 */
export async function createLocation(input: {
  name: string;
}): Promise<ActionResult<Location>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const result = await createLocationService(companyId, input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
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
): Promise<ActionResult<Location>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const result = await updateLocationService(id, companyId, changes);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
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

  const result = await deleteLocationService(id, companyId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
