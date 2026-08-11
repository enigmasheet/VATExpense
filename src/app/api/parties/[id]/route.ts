import { db } from "@/lib/db";
import { parties } from "@/lib/db/schema";
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
      .update(parties)
      .set(updates)
      .where(eq(parties.id, id))
      .returning();

    if (!updated) return notFound("Party not found");
    return apiOk({ data: updated });
  } catch (err) {
    console.error("PATCH /api/parties/[id] failed", err);
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
      .delete(parties)
      .where(eq(parties.id, id))
      .returning();

    if (!deleted) return notFound("Party not found");
    return apiOk({ data: { id: deleted.id } });
  } catch (err) {
    console.error("DELETE /api/parties/[id] failed", err);
    return internalError();
  }
}
