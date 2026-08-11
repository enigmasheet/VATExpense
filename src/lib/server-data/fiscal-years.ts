import { db } from "@/lib/db";
import { fiscalYears } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Retrieves all fiscal years for a company in descending order of start year.
 *
 * @param companyId - The company's identifier
 * @returns The company's fiscal years ordered from latest to earliest start year
 */
export async function getFiscalYears(companyId: string) {
  return db
    .select()
    .from(fiscalYears)
    .where(eq(fiscalYears.companyId, companyId))
    .orderBy(sql`${fiscalYears.startYear} desc`);
}

/**
 * Retrieves the active fiscal year for a company.
 *
 * @param companyId - The company identifier
 * @returns The active fiscal year, or `null` if none exists
 */
export async function getActiveFiscalYear(companyId: string) {
  const rows = await db
    .select()
    .from(fiscalYears)
    .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}
