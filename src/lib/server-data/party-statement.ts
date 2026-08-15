import { db } from "@/lib/db";
import { expenses, parties, categories, locations } from "@/lib/db/schema";
import { and, eq, sql, type SQL } from "drizzle-orm";

export interface PartyStatementRow {
  id: string;
  miti: string;
  nepaliMonth: string;
  invoiceNumber: string | null;
  itemName: string;
  categoryName: string | null;
  locationName: string | null;
  quantity: string | null;
  rate: string | null;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatRate: string;
  remarks: string | null;
}

export interface PartyStatementSummary {
  partyId: string;
  partyName: string;
  vatNumber: string | null;
  fiscalYearId: string;
  fiscalYearName: string;
  totalTaxableAmount: string;
  totalVatAmount: string;
  totalAmount: string;
  expenseCount: number;
}

/**
 * Fetches a party statement: all transactions for a party in a fiscal year,
 * with running totals for reconciliation.
 */
export async function getPartyStatement(
  companyId: string,
  partyId: string,
  fiscalYearId: string,
): Promise<{ summary: PartyStatementSummary; rows: PartyStatementRow[] }> {
  const conditions: SQL[] = [
    eq(expenses.companyId, companyId),
    eq(expenses.partyId, partyId),
    eq(expenses.fiscalYearId, fiscalYearId),
    eq(expenses.isDeleted, false),
  ];

  const rows = await db
    .select({
      id: expenses.id,
      miti: expenses.miti,
      nepaliMonth: expenses.nepaliMonth,
      invoiceNumber: expenses.invoiceNumber,
      itemName: expenses.item,
      categoryName: categories.name,
      locationName: locations.name,
      quantity: expenses.quantity,
      rate: expenses.rate,
      taxableAmount: expenses.taxableAmount,
      vatAmount: expenses.vatAmount,
      totalAmount: expenses.totalAmount,
      vatRate: expenses.vatRate,
      remarks: expenses.remarks,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .leftJoin(categories, eq(categories.id, expenses.categoryId))
    .leftJoin(locations, eq(locations.id, expenses.locationId))
    .where(and(...conditions))
    .orderBy(sql`${expenses.miti} asc, ${expenses.createdAt} asc`);

  // Get party name and VAT number
  const [party] = await db
    .select({ name: parties.name, vatNumber: parties.vatNumber })
    .from(parties)
    .where(eq(parties.id, partyId))
    .limit(1);

  // Get fiscal year name
  const { fiscalYears } = await import("@/lib/db/schema");
  const [fy] = await db
    .select({ name: fiscalYears.name })
    .from(fiscalYears)
    .where(eq(fiscalYears.id, fiscalYearId))
    .limit(1);

  // Compute summary
  const summary: PartyStatementSummary = {
    partyId,
    partyName: party?.name ?? "Unknown Party",
    vatNumber: party?.vatNumber ?? null,
    fiscalYearId,
    fiscalYearName: fy?.name ?? "Unknown FY",
    totalTaxableAmount: String(
      rows.reduce((acc, r) => acc + Number(r.taxableAmount), 0),
    ),
    totalVatAmount: String(
      rows.reduce((acc, r) => acc + Number(r.vatAmount), 0),
    ),
    totalAmount: String(
      rows.reduce((acc, r) => acc + Number(r.totalAmount), 0),
    ),
    expenseCount: rows.length,
  };

  return { summary, rows };
}
