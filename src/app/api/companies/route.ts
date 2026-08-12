import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { createCompanySchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, badRequest, conflict, unprocessableEntity, internalError, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";
import { ilike, eq } from "drizzle-orm";

/**
 * Retrieves companies, optionally filtered by ID and ordered by name.
 *
 * @param request - The request containing the optional `id` query parameter.
 * @returns A successful response containing the matching companies, or an internal-error response if the query fails.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    const where = id ? eq(companies.id, id) : undefined;
    const rows = await db.select().from(companies).where(where).orderBy(companies.name);
    return apiOk({ data: rows });
  } catch {
    return internalError();
  }
}

/**
 * Creates a company from the request body (superadmin only).
 *
 * @returns An API response containing the created company, or an error response for invalid input, duplicate names, or database failures.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== ROLE_SUPER_ADMIN) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(createCompanySchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const existing = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(ilike(companies.name, parsed.data.name))
      .limit(1);
    if (existing.length > 0) {
      return conflict("A company with this name already exists", { existing: existing[0] });
    }

    const [created] = await db
      .insert(companies)
      .values({
        name: parsed.data.name,
        vatNumber: parsed.data.vatNumber ?? null,
        address: parsed.data.address ?? null,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        defaultVatRate: parsed.data.defaultVatRate,
      })
      .returning();
    return apiOk({ data: created }, 201);
  } catch (err) {
    console.error("POST /api/companies failed", err);
    return internalError();
  }
}