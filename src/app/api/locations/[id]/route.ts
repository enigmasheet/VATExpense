import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import { eq } from "drizzle-orm";

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
