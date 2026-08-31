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
 * Retrieves a party's transactions for a fiscal year with aggregated statement totals.
 *
 * @returns The party statement summary and transaction rows
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
    .where(and(...conditions)).orderBy(sql`
  CASE
    WHEN ${expenses.miti} ~ '^\\d{2}/\\d{2}/\\d{4}$'
      THEN substring(${expenses.miti} from 7 for 4)
        || substring(${expenses.miti} from 4 for 2)
        || substring(${expenses.miti} from 1 for 2)
    ELSE ${expenses.miti}
  END ASC,
  CAST(${expenses.invoiceNumber} AS NUMERIC) ASC NULLS LAST,
  ${expenses.createdAt} ASC
`);

  const { fiscalYears } = await import("@/lib/db/schema");

  const [[party], [fy]] = await Promise.all([
    db
      .select({ name: parties.name, vatNumber: parties.vatNumber })
      .from(parties)
      .where(and(eq(parties.id, partyId), eq(parties.companyId, companyId)))
      .limit(1),
    db
      .select({ name: fiscalYears.name })
      .from(fiscalYears)
      .where(
        and(
          eq(fiscalYears.id, fiscalYearId),
          eq(fiscalYears.companyId, companyId),
        ),
      )
      .limit(1),
  ]);

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
