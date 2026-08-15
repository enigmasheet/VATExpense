import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import * as truckService from "@/lib/services/trucks";

/**
 * Updates a truck with the provided valid fields.
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
  const changes: { name?: string; ownerName?: string | null; truckType?: string | null; isActive?: boolean } = {};
  if ("name" in data && typeof data.name === "string") changes.name = data.name;
  if ("ownerName" in data) changes.ownerName = data.ownerName as string | null;
  if ("truckType" in data) changes.truckType = data.truckType as string | null;
  if ("isActive" in data && typeof data.isActive === "boolean") changes.isActive = data.isActive;

  if (Object.keys(changes).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await truckService.updateTruck(id, companyId, changes);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("PATCH /api/trucks/[id] failed", err);
    return internalError();
  }
}

/**
 * Deletes the truck identified by the route parameter.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const result = await truckService.deleteTruck(id, companyId);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("DELETE /api/trucks/[id] failed", err);
    return internalError();
  }
}
