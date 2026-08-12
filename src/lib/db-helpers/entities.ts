import { db } from "@/lib/db";
import { fiscalYears, parties, importBatches } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Finds a fiscal year scoped to a company.
 */
export async function findFiscalYearByIdAndCompany(fyId: string, companyId: string) {
  return (
    await db
      .select()
      .from(fiscalYears)
      .where(and(eq(fiscalYears.id, fyId), eq(fiscalYears.companyId, companyId)))
      .limit(1)
  )[0] ?? null;
}

/**
 * Finds a party scoped to a company.
 */
export async function findPartyByIdAndCompany(partyId: string, companyId: string) {
  return (
    await db
      .select()
      .from(parties)
      .where(and(eq(parties.id, partyId), eq(parties.companyId, companyId)))
      .limit(1)
  )[0] ?? null;
}

/**
 * Finds an import batch by ID.
 */
export async function findImportBatchById(batchId: string) {
  return (
    await db
      .select()
      .from(importBatches)
      .where(eq(importBatches.id, batchId))
      .limit(1)
  )[0] ?? null;
}
