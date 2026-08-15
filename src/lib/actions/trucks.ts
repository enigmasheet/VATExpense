"use server";

import { requireCompanyId, type ActionResult } from "./common";
import { createTruck as createTruckService, updateTruck as updateTruckService, deleteTruck as deleteTruckService, type Truck } from "@/lib/services/trucks";
import { ERR_NOT_AUTHENTICATED } from "@/lib/status-constants";

export type { ActionResult };

/**
 * Creates a company-scoped truck.
 */
export async function createTruck(input: {
  name: string;
  ownerName?: string | null;
  truckType?: string | null;
}): Promise<ActionResult<Truck>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  const result = await createTruckService(companyId, input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

/**
 * Updates a company-owned truck.
 */
export async function updateTruck(
  id: string,
  changes: { name?: string; ownerName?: string | null; truckType?: string | null; isActive?: boolean },
): Promise<ActionResult<Truck>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  const result = await updateTruckService(id, companyId, changes);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

/**
 * Deletes a company-owned truck.
 */
export async function deleteTruck(id: string): Promise<ActionResult<{ id: string }>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  const result = await deleteTruckService(id, companyId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
