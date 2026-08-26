import { createItemCategorySchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, badRequest, conflict, unprocessableEntity, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import * as itemCategoryService from "@/lib/services/item-categories";

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const rows = await itemCategoryService.listItemCategories(companyId);
    return apiOk({ data: rows });
  } catch (err) {
    console.error("GET /api/item-categories failed", err);
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

  const parsed = safeParse(createItemCategorySchema.omit({ companyId: true }), body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const result = await itemCategoryService.createItemCategory(companyId, parsed.data);
    if (!result.ok) return conflict(result.error);
    return apiOk({ data: result.data }, 201);
  } catch (err) {
    console.error("POST /api/item-categories failed", err);
    return internalError();
  }
}
