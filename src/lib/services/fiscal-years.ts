import { db } from "@/lib/db";
import { fiscalYears } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { ServiceResult } from "./types";

export type FiscalYear = typeof fiscalYears.$inferSelect;

/**
 * Creates a fiscal year with duplicate name detection.
 * Activating the new fiscal year deactivates the company's existing active fiscal years.
 */
export async function createFiscalYear(
  companyId: string,
  input: {
    name: string;
    startYear: number;
    endYear: number;
    isActive?: boolean;
  },
): Promise<ServiceResult<FiscalYear>> {
  const existing = (
    await db
      .select()
      .from(fiscalYears)
      .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.name, input.name)))
      .limit(1)
  )[0];
  if (existing) return { ok: false, error: `Fiscal year "${input.name}" already exists` };

  if (input.isActive) {
    await db
      .update(fiscalYears)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(eq(fiscalYears.companyId, companyId));
  }

  const [created] = await db
    .insert(fiscalYears)
    .values({
      companyId,
      name: input.name,
      startYear: input.startYear,
      endYear: input.endYear,
      isActive: input.isActive,
    })
    .returning();

  return { ok: true, data: created };
}

/**
 * Updates a fiscal year by ID, scoped to a company.
 * Activating a fiscal year deactivates other active fiscal years for the same company.
 */
export async function updateFiscalYear(
  id: string,
  companyId: string,
  changes: { name?: string; isActive?: boolean },
): Promise<ServiceResult<FiscalYear>> {
  if (changes.isActive) {
    await db
      .update(fiscalYears)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.isActive, true)));
  }

  const values: Record<string, unknown> = {};
  if (changes.name !== undefined) values.name = changes.name;
  if (changes.isActive !== undefined) values.isActive = changes.isActive;

  if (Object.keys(values).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  const [updated] = await db
    .update(fiscalYears)
    .set({ ...values, updatedAt: sql`now()` })
    .where(and(eq(fiscalYears.id, id), eq(fiscalYears.companyId, companyId)))
    .returning();

  if (!updated) return { ok: false, error: "Fiscal year not found" };
  return { ok: true, data: updated };
}

/**
 * Deletes a fiscal year by ID, scoped to a company.
 */
export async function deleteFiscalYear(
  id: string,
  companyId: string,
): Promise<ServiceResult<{ id: string }>> {
  const [deleted] = await db
    .delete(fiscalYears)
    .where(and(eq(fiscalYears.id, id), eq(fiscalYears.companyId, companyId)))
    .returning();

  if (!deleted) return { ok: false, error: "Fiscal year not found" };
  return { ok: true, data: { id: deleted.id } };
}
