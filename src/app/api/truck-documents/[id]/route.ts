import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { updateTruckDocumentSchema } from "@/lib/validation/masters";
import * as truckDocumentService from "@/lib/services/truck-documents";

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

  const parsed = updateTruckDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  }

  if (Object.keys(parsed.data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await truckDocumentService.updateTruckDocument(id, companyId, parsed.data);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("PATCH /api/truck-documents/[id] failed", err);
    return internalError();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const result = await truckDocumentService.deleteTruckDocument(id, companyId);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("DELETE /api/truck-documents/[id] failed", err);
    return internalError();
  }
}
