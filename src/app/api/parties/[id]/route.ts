import { apiOk, badRequest, conflict, notFound, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { updatePartySchema } from "@/lib/validation/masters";
import * as partyService from "@/lib/services/parties";

/**
 * Updates the specified party's name, VAT number, location, or active status.
 *
 * @param params - Route parameters containing the party ID.
 * @returns An HTTP response containing the updated party or an error response.
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

  const parsed = updatePartySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const changes = parsed.data;
  if (Object.keys(changes).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await partyService.updateParty(id, companyId, changes);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("PATCH /api/parties/[id] failed", err);
    return internalError();
  }
}

/**
 * Deletes a party by ID.
 *
 * @param request - The incoming HTTP request
 * @param params - Route parameters containing the party ID
 * @returns A success response containing the deleted party ID, or a not-found or internal-error response
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const result = await partyService.deleteParty(id, companyId);
    if (!result.ok) {
      return result.error.includes("referenced by")
        ? conflict(result.error)
        : notFound(result.error);
    }
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("DELETE /api/parties/[id] failed", err);
    return internalError();
  }
}
