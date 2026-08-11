import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import { eq } from "drizzle-orm";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const data = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if ("name" in data && typeof data.name === "string") {
    updates.name = data.name;
  }
  if ("isActive" in data && typeof data.isActive === "boolean") {
    updates.isActive = data.isActive;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const [updated] = await db
      .update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();

    if (!updated) return notFound("Location not found");
    return apiOk({ data: updated });
  } catch (err) {
    console.error("PATCH /api/locations/[id] failed", err);
    return internalError();
  }
}

/**
 * Deletes a location by its identifier.
 *
 * @param params - Route parameters containing the location identifier
 * @returns A success response containing the deleted location ID, a not-found response, or an internal-error response
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const [deleted] = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning();

    if (!deleted) return notFound("Location not found");
    return apiOk({ data: { id: deleted.id } });
  } catch (err) {
    console.error("DELETE /api/locations/[id] failed", err);
    return internalError();
  }
}
