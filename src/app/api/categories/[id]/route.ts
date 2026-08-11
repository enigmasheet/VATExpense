import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import * as categoryService from "@/lib/services/categories";

function getCompanyId(url: URL): string | null {
  const value = url.searchParams.get("companyId");
  return value && value.length > 0 ? value : null;
}

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
  const companyId = getCompanyId(new URL(request.url));
  if (!companyId) return badRequest("companyId query parameter is required");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const data = body as Record<string, unknown>;
  const changes: { name?: string; isActive?: boolean } = {};
  if ("name" in data && typeof data.name === "string") changes.name = data.name;
  if ("isActive" in data && typeof data.isActive === "boolean") changes.isActive = data.isActive;

  if (Object.keys(changes).length === 0) {
    return badRequest("No valid fields to update");
  }

  try {
    const result = await categoryService.updateCategory(id, companyId, changes);
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
  const companyId = getCompanyId(new URL(request.url));
  if (!companyId) return badRequest("companyId query parameter is required");

  try {
    const result = await categoryService.deleteCategory(id, companyId);
    if (!result.ok) return notFound(result.error);
    return apiOk({ data: result.data });
  } catch (err) {
    console.error("DELETE /api/categories/[id] failed", err);
    return internalError();
  }
}
