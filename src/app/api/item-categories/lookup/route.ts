import { apiOk, badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { normalizeName } from "@/lib/normalize";
import { db } from "@/lib/db";
import { itemCategories, categories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const item = new URL(request.url).searchParams.get("item");
  if (!item || !item.trim()) return badRequest("Query parameter 'item' is required");

  try {
    const normalizedItemName = normalizeName(item);
    const [row] = await db
      .select({
        id: itemCategories.id,
        itemName: itemCategories.itemName,
        categoryId: itemCategories.categoryId,
        categoryName: categories.name,
      })
      .from(itemCategories)
      .leftJoin(categories, eq(categories.id, itemCategories.categoryId))
      .where(
        and(
          eq(itemCategories.companyId, companyId),
          eq(itemCategories.normalizedItemName, normalizedItemName),
        ),
      )
      .limit(1);

    return apiOk({ data: row ?? null });
  } catch (err) {
    console.error("GET /api/item-categories/lookup failed", err);
    return internalError();
  }
}
