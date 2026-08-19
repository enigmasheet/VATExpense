import { apiOk, badRequest, conflict, notFound, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { updateCategorySchema } from "@/lib/validation/masters";
import * as categoryService from "@/lib/services/categories";

/**
 * Updates a category with the provided valid fields.
 *
 * @param params - Route parameters containing the category ID
 * @returns A response containing the updated category or an error status
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

  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  }

  if (Object.keys(parsed.data).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await categoryService.updateCategory(id, companyId, parsed.data);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("PATCH /api/categories/[id] failed", err);
    return internalError();
  }
}

/**
 * Deletes the category identified by the route parameter.
 *
 * @param params - Route parameters containing the category ID
 * @returns A success response containing the deleted category ID, or an error response if the category is missing or deletion fails
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const result = await categoryService.deleteCategory(id, companyId);
    if (!result.ok) {
      return result.error.includes("referenced by")
        ? conflict(result.error)
        : notFound(result.error);
    }
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("DELETE /api/categories/[id] failed", err);
    return internalError();
  }
}
