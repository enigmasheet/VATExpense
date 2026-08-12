import { db } from "@/lib/db";
import { parties, locations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Shared select columns for party queries with joined location name.
 */
export const PARTY_SELECT_WITH_LOCATION = {
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
} as const;

/**
 * Finds all parties for a company with their location names.
 */
export async function findPartiesWithLocation(companyId: string) {
  return db
    .select(PARTY_SELECT_WITH_LOCATION)
    .from(parties)
    .leftJoin(locations, eq(locations.id, parties.locationId))
    .where(eq(parties.companyId, companyId))
    .orderBy(parties.name);
}
