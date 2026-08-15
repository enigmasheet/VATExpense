"use server";

import { requireCompanyId, type ActionResult } from "./common";
import { createFiscalYear as createFiscalYearService, updateFiscalYear as updateFiscalYearService, deleteFiscalYear as deleteFiscalYearService, type FiscalYear } from "@/lib/services/fiscal-years";

export type { ActionResult };

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
}): Promise<ActionResult<FiscalYear>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const result = await createFiscalYearService(companyId, input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
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
  changes: { name?: string; startYear?: number; endYear?: number; isActive?: boolean },
): Promise<ActionResult<FiscalYear>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const result = await updateFiscalYearService(id, companyId, changes);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
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

  const result = await deleteFiscalYearService(id, companyId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
