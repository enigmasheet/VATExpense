import { apiOk, badRequest, notFound, unprocessableEntity, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { updateTruckSchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
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

  const parsed = safeParse(updateTruckSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  if (Object.keys(parsed.data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await truckService.updateTruck(id, companyId, parsed.data);
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
