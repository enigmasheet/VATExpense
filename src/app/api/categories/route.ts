import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { createCategorySchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, badRequest, conflict, unprocessableEntity, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { normalizeName } from "@/lib/normalize";
import { and, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.companyId, companyId))
      .orderBy(categories.name);
    return apiOk({ data: rows });
  } catch {
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

  const parsed = safeParse(createCategorySchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const { name, isActive } = parsed.data;
    const normalizedName = normalizeName(name);

    const existing = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(
        and(eq(categories.companyId, companyId), eq(categories.normalizedName, normalizedName)),
      )
      .limit(1);
    if (existing.length > 0) {
      return conflict(`Category "${name}" already exists`, { existing: existing[0] });
    }

    const [created] = await db
      .insert(categories)
      .values({ companyId, name, normalizedName, isActive })
      .returning();
    return apiOk({ data: created }, 201);
  } catch (err) {
    console.error("POST /api/categories failed", err);
    return internalError();
  }
}