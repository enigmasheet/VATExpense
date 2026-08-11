import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import * as partyService from "@/lib/services/parties";

function getCompanyId(url: URL): string | null {
  const value = url.searchParams.get("companyId");
  return value && value.length > 0 ? value : null;
}

/**
 * Updates the specified party's name or active status.
 *
 * @param params - Route parameters containing the party ID.
 * @returns An HTTP response containing the updated party or an error response.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = getCompanyId(new URL(request.url));
  if (!companyId) return badRequest("companyId query parameter is required");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const data = body as Record<string, unknown>;
  const changes: { name?: string; isActive?: boolean } = {};
  if ("name" in data && typeof data.name === "string") changes.name = data.name;
  if ("isActive" in data && typeof data.isActive === "boolean") changes.isActive = data.isActive;

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
  const companyId = getCompanyId(new URL(request.url));
  if (!companyId) return badRequest("companyId query parameter is required");

  try {
    const result = await partyService.deleteParty(id, companyId);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("DELETE /api/parties/[id] failed", err);
    return internalError();
  }
}
