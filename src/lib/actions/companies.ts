"use server";

import { requireCompanyId, type ActionResult } from "./common";
import { updateCompany as updateCompanyService, type Company } from "@/lib/services/companies";
import { ERR_NOT_AUTHENTICATED } from "@/lib/status-constants";

export type { ActionResult };

/**
 * Updates the current user's company.
 *
 * @param changes - The fields to update
 * @returns The updated company, or an error result
 */
export async function updateCompany(
  changes: {
    name?: string;
    vatNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    defaultVatRate?: string;
  },
): Promise<ActionResult<Company>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: ERR_NOT_AUTHENTICATED };
  }

  const result = await updateCompanyService(companyId, changes);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
