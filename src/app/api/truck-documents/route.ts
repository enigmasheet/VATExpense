import { createTruckDocumentSchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, badRequest, unprocessableEntity, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import * as truckDocumentService from "@/lib/services/truck-documents";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const truckId = new URL(request.url).searchParams.get("truckId");
  if (!truckId) return badRequest("Query parameter 'truckId' is required");
  if (!UUID_RE.test(truckId)) return badRequest("Invalid truckId");

  try {
    const rows = await truckDocumentService.listTruckDocuments(companyId, truckId);
    return apiOk({ data: rows });
  } catch (err) {
    console.error("GET /api/truck-documents failed", err);
    return internalError();
  }
}

export async function POST(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(createTruckDocumentSchema.omit({ companyId: true }), body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const result = await truckDocumentService.createTruckDocument(companyId, parsed.data);
    if (!result.ok) return badRequest(result.error);
    return apiOk({ data: result.data }, 201);
  } catch (err) {
    console.error("POST /api/truck-documents failed", err);
    return internalError();
  }
}
