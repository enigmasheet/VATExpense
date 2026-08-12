import { db } from "@/lib/db";
import { expenses, parties, categories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Shared select columns for expense queries with joined party and category names.
 */
export const EXPENSE_SELECT_WITH_JOINS = {
  id: expenses.id,
  miti: expenses.miti,
  invoiceNumber: expenses.invoiceNumber,
  partyId: expenses.partyId,
  categoryId: expenses.categoryId,
  locationId: expenses.locationId,
  item: expenses.item,
  quantity: expenses.quantity,
  rate: expenses.rate,
  taxableAmount: expenses.taxableAmount,
  vatAmount: expenses.vatAmount,
  totalAmount: expenses.totalAmount,
  vatRate: expenses.vatRate,
  remarks: expenses.remarks,
  rowVersion: expenses.rowVersion,
  partyName: parties.name,
  categoryName: categories.name,
} as const;

/**
 * Finds a single expense by ID, scoped to a company, with party and category names.
 */
export async function findExpenseById(id: string, companyId: string) {
  const row = await db
    .select(EXPENSE_SELECT_WITH_JOINS)
    .from(expenses)
    .leftJoin(parties, eq(parties.id, expenses.partyId))
    .leftJoin(categories, eq(categories.id, expenses.categoryId))
    .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)))
    .limit(1);

  return row[0] ?? null;
}
