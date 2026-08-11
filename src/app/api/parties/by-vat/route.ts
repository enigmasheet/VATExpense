import { db } from "@/lib/db";
import { parties, locations } from "@/lib/db/schema";
import { apiOk, badRequest, notFound, internalError } from "@/lib/api-response";
import { normalizeVatNumber } from "@/lib/normalize";
import { eq, and } from "drizzle-orm";

/**
 * Retrieves an active party by VAT number within a company.
 *
 * Returns a bad-request response when `companyId` or `vat` is missing or the VAT contains no digits, a not-found response when no active party matches, or the party data on success.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  const rawVat = url.searchParams.get("vat");

  if (!companyId) return badRequest("companyId query parameter is required");
  if (!rawVat) return badRequest("vat query parameter is required");

  const normalizedVat = normalizeVatNumber(rawVat);
  if (!normalizedVat) return badRequest("vat must contain at least one digit");

  try {
    const party = (
      await db
        .select({
          id: parties.id,
          name: parties.name,
          vatNumber: parties.vatNumber,
          normalizedVatNumber: parties.normalizedVatNumber,
          locationId: parties.locationId,
          locationName: locations.name,
        })
        .from(parties)
        .leftJoin(locations, eq(locations.id, parties.locationId))
        .where(
          and(
            eq(parties.companyId, companyId),
            eq(parties.normalizedVatNumber, normalizedVat),
            eq(parties.isActive, true),
          ),
        )
        .limit(1)
    )[0];

    if (!party) return notFound(`No active party found with VAT number "${rawVat}"`);
    return apiOk({ data: party });
  } catch (err) {
    console.error("GET /api/parties/by-vat failed", err);
    return internalError();
  }
}
