import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import * as locationService from "@/lib/services/locations";

/**
 * Updates a location identified by its route ID.
 *
 * @param request - The request containing a JSON body with valid `name` and/or `isActive` fields
 * @param params - The route parameters containing the location ID
 * @returns A success response with the updated location, or an error response for invalid input, a missing location, or a database failure
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

  const data = body as Record<string, unknown>;
  const changes: { name?: string; isActive?: boolean } = {};
  if ("name" in data && typeof data.name === "string") changes.name = data.name;
  if ("isActive" in data && typeof data.isActive === "boolean") changes.isActive = data.isActive;

  if (Object.keys(changes).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await locationService.updateLocation(id, companyId, changes);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("PATCH /api/locations/[id] failed", err);
    return internalError();
  }
}

/**
 * Deletes a location by its identifier.
 *
 * @param request - The incoming HTTP request
 * @param params - Route parameters containing the location identifier
 * @returns A success response containing the deleted location ID, a not-found response, or an internal-error response
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const result = await locationService.deleteLocation(id, companyId);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("DELETE /api/locations/[id] failed", err);
    return internalError();
  }
}
