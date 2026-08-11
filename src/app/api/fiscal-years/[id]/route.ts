import { db } from "@/lib/db";
import { fiscalYears } from "@/lib/db/schema";
import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import { eq, and } from "drizzle-orm";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const data = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof data.name === "string") updates.name = data.name;
  if (typeof data.startYear === "number") updates.startYear = data.startYear;
  if (typeof data.endYear === "number") updates.endYear = data.endYear;

  if (typeof data.isActive === "boolean") {
    updates.isActive = data.isActive;
    if (data.isActive === true) {
      const fy = (
        await db.select().from(fiscalYears).where(eq(fiscalYears.id, id)).limit(1)
      )[0];
      if (fy) {
        await db
          .update(fiscalYears)
          .set({ isActive: false })
          .where(and(eq(fiscalYears.companyId, fy.companyId), eq(fiscalYears.isActive, true)));
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const [updated] = await db
      .update(fiscalYears)
      .set(updates)
      .where(eq(fiscalYears.id, id))
      .returning();

    if (!updated) return notFound("Fiscal year not found");
    return apiOk({ data: updated });
  } catch (err) {
    console.error("PATCH /api/fiscal-years/[id] failed", err);
    return internalError();
  }
}

/**
 * Deletes a fiscal year by ID.
 *
 * @param _request - The incoming HTTP request.
 * @param params - Route parameters containing the fiscal year ID.
 * @returns The deleted fiscal year ID, or an error response if the fiscal year is not found or deletion fails.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const [deleted] = await db
      .delete(fiscalYears)
      .where(eq(fiscalYears.id, id))
      .returning();

    if (!deleted) return notFound("Fiscal year not found");
    return apiOk({ data: { id: deleted.id } });
  } catch (err) {
    console.error("DELETE /api/fiscal-years/[id] failed", err);
    return internalError();
  }
}
