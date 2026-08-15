"use server";

import { requireCompanyId, type ActionResult } from "./common";
import { createParty as createPartyService, updateParty as updatePartyService, deleteParty as deletePartyService, type Party } from "@/lib/services/parties";
import { ERR_NOT_AUTHENTICATED } from "@/lib/status-constants";

export type { ActionResult };

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
  phone?: string | null;
  whatsapp?: string | null;
  comment?: string | null;
}): Promise<ActionResult<Party>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  const result = await createPartyService(companyId, input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

/**
 * Updates a company-owned party's fields.
 *
 * @param id - The party identifier
 * @param changes - The party fields to update (name, vatNumber, locationId, isActive)
 * @returns The updated party on success, or an error result if authentication, lookup, or database operations fail
 */
export async function updateParty(
  id: string,
  changes: { name?: string; vatNumber?: string | null; locationId?: string | null; phone?: string | null; whatsapp?: string | null; comment?: string | null; isActive?: boolean },
): Promise<ActionResult<Party>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  const result = await updatePartyService(id, companyId, changes);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
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
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  const result = await deletePartyService(id, companyId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
