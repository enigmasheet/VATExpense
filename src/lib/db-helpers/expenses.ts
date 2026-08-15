import { db } from "@/lib/db";
import { expenses, parties, categories, locations, trucks } from "@/lib/db/schema";
import { and, eq, aliasedTable } from "drizzle-orm";

const locationAlias = aliasedTable(locations, "location");
const truckAlias = aliasedTable(trucks, "truck");

/**
 * Shared select columns for expense queries with joined party, category, location, and truck names.
 */
export const EXPENSE_SELECT_WITH_JOINS = {
  id: expenses.id,
  companyId: expenses.companyId,
  fiscalYearId: expenses.fiscalYearId,
  partyId: expenses.partyId,
  categoryId: expenses.categoryId,
  locationId: expenses.locationId,
  truckId: expenses.truckId,
  miti: expenses.miti,
  nepaliMonth: expenses.nepaliMonth,
  invoiceNumber: expenses.invoiceNumber,
  item: expenses.item,
  quantity: expenses.quantity,
  rate: expenses.rate,
  taxableAmount: expenses.taxableAmount,
  vatAmount: expenses.vatAmount,
  totalAmount: expenses.totalAmount,
  vatRate: expenses.vatRate,
  remarks: expenses.remarks,
  isDeleted: expenses.isDeleted,
  deletedAt: expenses.deletedAt,
  rowVersion: expenses.rowVersion,
  createdAt: expenses.createdAt,
  updatedAt: expenses.updatedAt,
  partyName: parties.name,
  categoryName: categories.name,
  locationName: locationAlias.name,
  truckName: truckAlias.name,
} as const;

/**
 * Finds a single expense by ID, scoped to a company, with party, category, location, and truck names.
 */
export async function findExpenseById(id: string, companyId: string) {
  const row = await db
    .select(EXPENSE_SELECT_WITH_JOINS)
    .from(expenses)
    .leftJoin(parties, eq(parties.id, expenses.partyId))
    .leftJoin(categories, eq(categories.id, expenses.categoryId))
    .leftJoin(locationAlias, eq(locationAlias.id, expenses.locationId))
    .leftJoin(truckAlias, eq(truckAlias.id, expenses.truckId))
    .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)))
    .limit(1);

  return row[0] ?? null;
}
