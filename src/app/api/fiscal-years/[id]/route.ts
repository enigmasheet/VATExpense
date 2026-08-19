import { apiOk, badRequest, conflict, notFound, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { updateFiscalYearSchema } from "@/lib/validation/masters";
import * as fiscalYearService from "@/lib/services/fiscal-years";

/**
 * Updates a fiscal year by ID.
 *
 * Activating the fiscal year deactivates other active fiscal years belonging to
 * the same company.
 *
 * @param params - Route parameters containing the fiscal year ID
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = updateFiscalYearSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  }

  if (Object.keys(parsed.data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await fiscalYearService.updateFiscalYear(id, companyId, parsed.data);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("PATCH /api/fiscal-years/[id] failed", err);
    return internalError();
  }
}

/**
 * Deletes a fiscal year by ID.
 *
 * @param request - The incoming HTTP request.
 * @param params - Route parameters containing the fiscal year ID.
 * @returns The deleted fiscal year ID, or an error response if the fiscal year is not found or deletion fails.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const result = await fiscalYearService.deleteFiscalYear(id, companyId);
    if (!result.ok) {
      return result.error.includes("referenced by")
        ? conflict(result.error)
        : notFound(result.error);
    }
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("DELETE /api/fiscal-years/[id] failed", err);
    return internalError();
  }
}
