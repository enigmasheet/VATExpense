import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  expenses,
  companies,
  fiscalYears,
  parties,
  categories,
  locations,
} from "@/lib/db/schema";
import { and, eq, sql, aliasedTable } from "drizzle-orm";

const locationAlias = aliasedTable(locations, "location");

function requireCompanyId(sessionCompanyId: string | undefined): string | null {
  return sessionCompanyId ?? null;
}

export async function getCompanyId(): Promise<string | null> {
  const session = await auth();
  return requireCompanyId((session?.user as { companyId?: string })?.companyId);
}

export async function getCompany(companyId: string) {
  const rows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return rows[0] ?? null;
}

export async function getFiscalYears(companyId: string) {
  return db
    .select()
    .from(fiscalYears)
    .where(eq(fiscalYears.companyId, companyId))
    .orderBy(sql`${fiscalYears.startYear} desc`);
}

export async function getActiveFiscalYear(companyId: string) {
  const rows = await db
    .select()
    .from(fiscalYears)
    .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

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

export async function getCategories(companyId: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.companyId, companyId))
    .orderBy(categories.name);
}

export async function getLocations(companyId: string) {
  return db
    .select()
    .from(locations)
    .where(eq(locations.companyId, companyId))
    .orderBy(locations.name);
}

/**
 * Dashboard summary — uses SQL aggregation instead of fetching all rows.
 */
export async function getDashboardSummary(companyId: string, fiscalYearId: string) {
  const [totals] = await db
    .select({
      taxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      vatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
      expenseCount: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.isDeleted, false),
      ),
    );

  const recent = await db
    .select({
      id: expenses.id,
      miti: expenses.miti,
      invoiceNumber: expenses.invoiceNumber,
      item: expenses.item,
      totalAmount: expenses.totalAmount,
      partyName: parties.name,
    })
    .from(expenses)
    .leftJoin(parties, eq(parties.id, expenses.partyId))
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.isDeleted, false),
      ),
    )
    .orderBy(sql`${expenses.miti} desc, ${expenses.createdAt} desc`)
    .limit(5);

  return { totals, recent };
}

/**
 * Paginated expenses list with filters.
 */
export interface ExpenseListParams {
  companyId: string;
  fiscalYearId?: string;
  partyId?: string;
  categoryId?: string;
  month?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function getExpenses(params: ExpenseListParams) {
  const {
    companyId,
    fiscalYearId,
    partyId,
    categoryId,
    month,
    q,
    page = 1,
    pageSize = 50,
  } = params;

  const conditions = [
    eq(expenses.companyId, companyId),
    eq(expenses.isDeleted, false),
  ];
  if (fiscalYearId) conditions.push(eq(expenses.fiscalYearId, fiscalYearId));
  if (partyId) conditions.push(eq(expenses.partyId, partyId));
  if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));
  if (month) conditions.push(eq(expenses.nepaliMonth, month));
  if (q) {
    const pattern = `%${q.trim()}%`;
    conditions.push(
      sql`(${expenses.item} ilike ${pattern} or ${expenses.invoiceNumber} ilike ${pattern} or ${expenses.remarks} ilike ${pattern})`,
    );
  }

  const where = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(where);

  const rows = await db
    .select({
      id: expenses.id,
      miti: expenses.miti,
      nepaliMonth: expenses.nepaliMonth,
      invoiceNumber: expenses.invoiceNumber,
      item: expenses.item,
      taxableAmount: expenses.taxableAmount,
      vatAmount: expenses.vatAmount,
      totalAmount: expenses.totalAmount,
      rowVersion: expenses.rowVersion,
      partyId: expenses.partyId,
      partyName: parties.name,
      categoryName: categories.name,
    })
    .from(expenses)
    .leftJoin(parties, eq(parties.id, expenses.partyId))
    .leftJoin(categories, eq(categories.id, expenses.categoryId))
    .where(where)
    .orderBy(sql`${expenses.miti} desc, ${expenses.createdAt} desc`)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { data: rows, page, pageSize, total: Number(count) };
}

/**
 * Get a single expense by ID.
 */
export async function getExpenseById(id: string) {
  const row = await db
    .select({
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
    })
    .from(expenses)
    .leftJoin(parties, eq(parties.id, expenses.partyId))
    .leftJoin(categories, eq(categories.id, expenses.categoryId))
    .where(eq(expenses.id, id))
    .limit(1);

  return row[0] ?? null;
}

/**
 * Monthly report aggregation.
 */
export async function getMonthlyReport(
  companyId: string,
  fiscalYearId: string,
  nepaliMonth: string,
) {
  const categoriesData = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      totalTaxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      totalVatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
      expenseCount: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .leftJoin(categories, eq(categories.id, expenses.categoryId))
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.nepaliMonth, nepaliMonth),
        eq(expenses.isDeleted, false),
      ),
    )
    .groupBy(categories.id, categories.name);

  const [totals] = await db
    .select({
      totalTaxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      totalVatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
      expenseCount: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.nepaliMonth, nepaliMonth),
        eq(expenses.isDeleted, false),
      ),
    );

  return {
    nepaliMonth,
    fiscalYearId,
    companyId,
    categories: categoriesData,
    totals,
  };
}

/**
 * Fiscal year report aggregation.
 */
const NEPALI_MONTHS_ORDER = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;

export async function getFiscalYearReport(companyId: string, fiscalYearId: string) {
  const monthData = await db
    .select({
      nepaliMonth: expenses.nepaliMonth,
      totalTaxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      totalVatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
      expenseCount: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.isDeleted, false),
      ),
    )
    .groupBy(expenses.nepaliMonth);

  const monthsMap = new Map(monthData.map((m) => [m.nepaliMonth, m]));

  const months = NEPALI_MONTHS_ORDER.map((name) => {
    const m = monthsMap.get(name);
    return {
      nepaliMonth: name,
      totalTaxableAmount: m?.totalTaxableAmount ?? "0",
      totalVatAmount: m?.totalVatAmount ?? "0",
      totalAmount: m?.totalAmount ?? "0",
      expenseCount: m?.expenseCount ?? 0,
    };
  });

  const [totals] = await db
    .select({
      totalTaxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      totalVatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
      expenseCount: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.isDeleted, false),
      ),
    );

  return { fiscalYearId, companyId, months, totals };
}
