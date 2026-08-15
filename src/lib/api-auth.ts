import { auth } from "@/auth";
import { unauthorized, notFound } from "./api-response";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
  companyId: string | null;
  role: string;
}

/**
 * Extracts companyId from the authenticated session.
 *
 * For regular users: returns the session's companyId (fails with 401 if missing).
 * For superadmins: accepts companyId from the query parameter and validates it exists in DB.
 *
 * @returns The companyId string, or a NextResponse error (check with `typeof result === 'string'`)
 */
export async function requireCompanyIdFromSession(
  request: Request,
): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const user = session.user as SessionUser;
  const isSuperAdmin = user.role === ROLE_SUPER_ADMIN;

  if (isSuperAdmin) {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId");
    if (!companyId) return unauthorized("SuperAdmin must provide companyId query parameter");

    // Validate the company exists in the database
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (!company) return notFound("Company not found");

    return companyId;
  }

  if (!user.companyId) return unauthorized("No company associated with this account");
  return user.companyId;
}

/**
 * Returns the session user, or null if unauthenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}
