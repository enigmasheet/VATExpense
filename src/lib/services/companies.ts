import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { ServiceResult } from "./types";

export type Company = typeof companies.$inferSelect;

/**
 * Updates a company by ID.
 */
export async function updateCompany(
  id: string,
  changes: {
    name?: string;
    vatNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    defaultVatRate?: string;
  },
): Promise<ServiceResult<Company>> {
  const values: Record<string, unknown> = {};
  if (changes.name !== undefined) values.name = changes.name;
  if (changes.vatNumber !== undefined) values.vatNumber = changes.vatNumber;
  if (changes.address !== undefined) values.address = changes.address;
  if (changes.phone !== undefined) values.phone = changes.phone;
  if (changes.email !== undefined) values.email = changes.email;
  if (changes.defaultVatRate !== undefined) values.defaultVatRate = changes.defaultVatRate;

  if (Object.keys(values).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  const [updated] = await db
    .update(companies)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(companies.id, id))
    .returning();

  if (!updated) return { ok: false, error: "Company not found" };
  return { ok: true, data: updated };
}
