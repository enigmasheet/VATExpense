import { db } from "@/lib/db";
import { parties } from "@/lib/db/schema";
import { createPartySchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, badRequest, conflict, unprocessableEntity, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { findPartiesWithLocation } from "@/lib/db-helpers/parties";
import { normalizeName, normalizeVatNumber } from "@/lib/normalize";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const rows = await findPartiesWithLocation(companyId);
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

  const parsed = safeParse(createPartySchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const { name, vatNumber, locationId, isActive } = parsed.data;
    const normalizedName = normalizeName(name);
    const normalizedVatNumber = normalizeVatNumber(vatNumber);

    if (normalizedVatNumber) {
      const vatDup = await db
        .select({ id: parties.id, name: parties.name })
        .from(parties)
        .where(
          and(
            eq(parties.companyId, companyId),
            eq(parties.normalizedVatNumber, normalizedVatNumber),
          ),
        )
        .limit(1);
      if (vatDup.length > 0) {
        return conflict(
          `A party with VAT number "${vatNumber}" already exists`,
          { existing: vatDup[0] },
        );
      }
    }

    const nameDup = await db
      .select({ id: parties.id, name: parties.name })
      .from(parties)
      .where(
        and(
          eq(parties.companyId, companyId),
          eq(parties.normalizedName, normalizedName),
          normalizedVatNumber === null
            ? isNull(parties.normalizedVatNumber)
            : eq(parties.normalizedVatNumber, normalizedVatNumber),
        ),
      )
      .limit(1);
    if (nameDup.length > 0) {
      return conflict(`Party "${name}" already exists`, { existing: nameDup[0] });
    }

    const [created] = await db
      .insert(parties)
      .values({
        companyId,
        name,
        normalizedName,
        vatNumber: vatNumber ?? null,
        normalizedVatNumber,
        locationId: locationId ?? null,
        isActive,
      })
      .returning();
    return apiOk({ data: created }, 201);
  } catch (err) {
    console.error("POST /api/parties failed", err);
    return internalError();
  }
}