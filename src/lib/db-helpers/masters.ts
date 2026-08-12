import { db } from "@/lib/db";
import { parties, categories, locations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Loads all active parties, categories, and locations for a company in a single Promise.all.
 * Used by import preview and other routes that need to resolve master data.
 */
export async function loadActiveMasterData(companyId: string) {
  const [activeParties, activeCategories, activeLocations] = await Promise.all([
    db.select().from(parties).where(and(eq(parties.companyId, companyId), eq(parties.isActive, true))),
    db.select().from(categories).where(and(eq(categories.companyId, companyId), eq(categories.isActive, true))),
    db.select().from(locations).where(and(eq(locations.companyId, companyId), eq(locations.isActive, true))),
  ]);

  return { parties: activeParties, categories: activeCategories, locations: activeLocations };
}
