import { db } from "@/lib/db";
import { parties, locations } from "@/lib/db/schema";
import { createPartySchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, badRequest, conflict, unprocessableEntity, internalError } from "@/lib/api-response";
import { normalizeName, normalizeVatNumber } from "@/lib/normalize";
import { and, eq, isNull } from "drizzle-orm";

function getCompanyId(url: URL): string | null {
  const value = url.searchParams.get("companyId");
  return value && value.length > 0 ? value : null;
}

export async function GET(request: Request) {
  const companyId = getCompanyId(new URL(request.url));
  if (!companyId) return badRequest("companyId query parameter is required");

  try {
    const rows = await db
      .select({
        id: parties.id,
        name: parties.name,
        normalizedName: parties.normalizedName,
        vatNumber: parties.vatNumber,
        normalizedVatNumber: parties.normalizedVatNumber,
        locationId: parties.locationId,
        locationName: locations.name,
        isActive: parties.isActive,
        createdAt: parties.createdAt,
        updatedAt: parties.updatedAt,
      })
      .from(parties)
      .leftJoin(locations, eq(locations.id, parties.locationId))
      .where(eq(parties.companyId, companyId))
      .orderBy(parties.name);
    return apiOk({ data: rows });
  } catch {
    return internalError();
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(createPartySchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const { companyId, name, vatNumber, locationId, isActive } = parsed.data;
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