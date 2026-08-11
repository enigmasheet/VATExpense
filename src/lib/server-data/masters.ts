import { db } from "@/lib/db";
import { parties, categories, locations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Retrieves the parties associated with a company, including their location names.
 *
 * @param companyId - The identifier of the company
 * @returns The company's parties ordered by name.
 */
export async function getParties(companyId: string) {
  return db
    .select({
      id: parties.id,
      name: parties.name,
      vatNumber: parties.vatNumber,
      locationId: parties.locationId,
      locationName: locations.name,
      isActive: parties.isActive,
    })
    .from(parties)
    .leftJoin(locations, eq(locations.id, parties.locationId))
    .where(eq(parties.companyId, companyId))
    .orderBy(parties.name);
}

/**
 * Retrieves the categories belonging to a company in name order.
 *
 * @param companyId - The company identifier
 * @returns The company's categories ordered by name
 */
export async function getCategories(companyId: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.companyId, companyId))
    .orderBy(categories.name);
}

/**
 * Retrieves the locations associated with a company in name order.
 *
 * @param companyId - The ID of the company whose locations to retrieve
 * @returns The company's locations ordered by name
 */
export async function getLocations(companyId: string) {
  return db
    .select()
    .from(locations)
    .where(eq(locations.companyId, companyId))
    .orderBy(locations.name);
}
