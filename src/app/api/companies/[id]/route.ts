import { apiOk, badRequest, notFound, unauthorized, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { updateCompanySchema } from "@/lib/validation/masters";
import { updateCompany } from "@/lib/services/companies";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";

/**
 * Updates a company (superadmin only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== ROLE_SUPER_ADMIN) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = updateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  }

  if (Object.keys(parsed.data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await updateCompany(id, parsed.data);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("PATCH /api/companies/[id] failed", err);
    return internalError();
  }
}
