"use server";

import { auth } from "@/auth";
import { ERR_NOT_AUTHENTICATED, ERR_COMPANY_NOT_FOUND } from "@/lib/status-constants";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Standard result union returned by server actions.
 */
export interface ActionError {
  ok: false;
  error: string;
  errors?: string[];
}

export interface ActionOk<T> {
  ok: true;
  data: T;
  warnings?: string[];
}

export type ActionResult<T> = ActionOk<T> | ActionError;

/**
 * Retrieves the authenticated user's company ID, validating existence.
 *
 * For regular users: returns the session companyId.
 * For superadmins: accepts companyId from the input parameter (superadmin has no company).
 *
 * @param inputCompanyId - Optional companyId from the action input (used by superadmin)
 * @returns The authenticated user's company ID
 * @throws If no authenticated company ID is available or company does not exist
 */
export async function requireCompanyId(inputCompanyId?: string): Promise<string> {
  const session = await auth();
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId ?? inputCompanyId;
  if (!companyId) throw new Error(ERR_NOT_AUTHENTICATED);

  // Validate company still exists
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) throw new Error(ERR_COMPANY_NOT_FOUND);

  return companyId;
}
