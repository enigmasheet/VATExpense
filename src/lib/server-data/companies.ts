import { auth } from "@/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Converts an optional session company ID into a nullable company ID.
 *
 * @param sessionCompanyId - The company ID from the authenticated session
 * @returns The session company ID, or `null` when it is undefined
 */
function requireCompanyId(sessionCompanyId: string | undefined): string | null {
  return sessionCompanyId ?? null;
}

/**
 * Retrieves the company ID associated with the authenticated user.
 *
 * @returns The authenticated user's company ID, or `null` when no company ID is available.
 */
export async function getCompanyId(): Promise<string | null> {
  const session = await auth();
  return requireCompanyId((session?.user as { companyId?: string })?.companyId);
}

/**
 * Returns the current session user's role and optional company ID.
 *
 * @returns The session user's role and companyId, or null if unauthenticated.
 */
export async function getSessionUser(): Promise<{ role: string; companyId?: string } | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    role: session.user.role,
    companyId: (session.user as { companyId?: string }).companyId,
  };
}

/**
 * Retrieves all companies ordered by name (admin listing).
 */
export async function getAllCompanies() {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      vatNumber: companies.vatNumber,
      defaultVatRate: companies.defaultVatRate,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .orderBy(companies.name);
}

/**
 * Retrieves a company by its ID.
 *
 * @param companyId - The company's unique identifier
 * @returns The matching company, or `null` if no company is found
 */
export async function getCompany(companyId: string) {
  const rows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return rows[0] ?? null;
}
