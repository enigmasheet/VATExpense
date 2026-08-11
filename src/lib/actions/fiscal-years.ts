"use server";

import { db } from "@/lib/db";
import { fiscalYears } from "@/lib/db/schema";
import { createFiscalYearSchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { eq, and, sql } from "drizzle-orm";
import { requireCompanyId, type ActionResult } from "./common";

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
}): Promise<ActionResult<typeof fiscalYears.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = safeParse(createFiscalYearSchema, { ...input, companyId });
  if (!parsed.ok) return { ok: false, error: "Validation failed", errors: parsed.errors };

  const data = parsed.data;

  try {
    if (data.isActive) {
      await db
        .update(fiscalYears)
        .set({ isActive: false, updatedAt: sql`now()` })
        .where(eq(fiscalYears.companyId, companyId));
    }

    const [created] = await db
      .insert(fiscalYears)
      .values({
        companyId,
        name: data.name,
        startYear: data.startYear,
        endYear: data.endYear,
        isActive: data.isActive,
      })
      .returning();

    return { ok: true, data: created };
  } catch (err) {
    console.error("createFiscalYear failed", err);
    return { ok: false, error: "Failed to create fiscal year" };
  }
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
  changes: { name?: string; isActive?: boolean },
): Promise<ActionResult<typeof fiscalYears.$inferSelect>> {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    if (changes.isActive) {
      await db
        .update(fiscalYears)
        .set({ isActive: false, updatedAt: sql`now()` })
        .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.isActive, true)));
    }

    const values: Record<string, unknown> = {};
    if (changes.name !== undefined) values.name = changes.name;
    if (changes.isActive !== undefined) values.isActive = changes.isActive;

    const [updated] = await db
      .update(fiscalYears)
      .set({ ...values, updatedAt: sql`now()` })
      .where(and(eq(fiscalYears.id, id), eq(fiscalYears.companyId, companyId)))
      .returning();

    if (!updated) return { ok: false, error: "Fiscal year not found" };
    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateFiscalYear failed", err);
    return { ok: false, error: "Failed to update fiscal year" };
  }
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

  try {
    await db
      .delete(fiscalYears)
      .where(and(eq(fiscalYears.id, id), eq(fiscalYears.companyId, companyId)));
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("deleteFiscalYear failed", err);
    return { ok: false, error: "Failed to delete fiscal year" };
  }
}
