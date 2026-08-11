"use server";

import { auth } from "@/auth";

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
 * Retrieves the authenticated user's company ID.
 *
 * @returns The authenticated user's company ID
 * @throws If no authenticated company ID is available
 */
export async function requireCompanyId(): Promise<string> {
  const session = await auth();
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) throw new Error("Not authenticated");
  return companyId;
}
