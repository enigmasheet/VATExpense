import { auth } from "@/auth";
import { unauthorized } from "./api-response";
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
 * For superadmins: accepts companyId from the query parameter (superadmin has no company).
 *
 * @returns The companyId string, or a NextResponse error (check with `typeof result === 'string'`)
 */
export async function requireCompanyIdFromSession(
  request: Request,
): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const user = session.user as SessionUser;
  const isSuperAdmin = user.role === "SuperAdmin";

  if (isSuperAdmin) {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId");
    if (!companyId) return unauthorized("SuperAdmin must provide companyId query parameter");
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
