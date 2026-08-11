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
import { and, eq, sql } from "drizzle-orm";

/**
 * Converts an optional session company ID into a nullable company ID.
 *
 * @param sessionCompanyId - The company ID from the authenticated session
 * @returns The session company ID, or `null` when it is undefined
 */
function requireCompanyId(sessionCompanyId: string | undefined): string | null {
  return sessionCompanyId ?? null;
}

/**
 * Retrieves the company ID associated with the authenticated user.
 *
 * @returns The authenticated user's company ID, or `null` when no company ID is available.
 */
export async function getCompanyId(): Promise<string | null> {
  const session = await auth();
  return requireCompanyId((session?.user as { companyId?: string })?.companyId);
}

/**
 * Returns the current session user's role and optional company ID.
 *
 * @returns The session user's role and companyId, or null if unauthenticated.
 */
export async function getSessionUser(): Promise<{ role: string; companyId?: string } | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    role: session.user.role,
    companyId: (session.user as { companyId?: string }).companyId,
  };
}

/**
 * Retrieves all companies ordered by name (admin listing).
 */
export async function getAllCompanies() {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      vatNumber: companies.vatNumber,
      defaultVatRate: companies.defaultVatRate,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .orderBy(companies.name);
}

/**
 * Retrieves a company by its ID.
 *
 * @param companyId - The company's unique identifier
 * @returns The matching company, or `null` if no company is found
 */
export async function getCompany(companyId: string) {
  const rows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Retrieves all fiscal years for a company in descending order of start year.
 *
 * @param companyId - The company's identifier
 * @returns The company's fiscal years ordered from latest to earliest start year
 */
export async function getFiscalYears(companyId: string) {
  return db
    .select()
    .from(fiscalYears)
    .where(eq(fiscalYears.companyId, companyId))
    .orderBy(sql`${fiscalYears.startYear} desc`);
}

/**
 * Retrieves the active fiscal year for a company.
 *
 * @param companyId - The company identifier
 * @returns The active fiscal year, or `null` if none exists
 */
export async function getActiveFiscalYear(companyId: string) {
  const rows = await db
    .select()
    .from(fiscalYears)
    .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

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

/**
 * Summarizes expenses for a company and fiscal year, including aggregate totals and recent expenses.
 *
 * @param companyId - The company identifier
 * @param fiscalYearId - The fiscal year identifier
 * @returns Aggregate taxable, VAT, and total amounts with the expense count, plus the five most recent expenses
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

/**
 * Retrieves paginated, non-deleted expenses for a company with optional filters and related party and category names.
 *
 * @param params - Company context, optional expense filters, and pagination settings.
 * @returns The matching expense rows, current page, page size, and total matching count.
 */
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
 * Retrieves a single expense with its related party and category names.
 *
 * @returns The matching expense, or `null` if no expense has the specified ID.
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
 * Generates an expense report for a company and fiscal year month, grouped by category.
 *
 * @param nepaliMonth - The Nepali month included in the report
 * @returns Category-level expense totals and overall totals for the specified month
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

/**
 * Generates an expense report for every month in a fiscal year.
 *
 * @param companyId - The company identifier
 * @param fiscalYearId - The fiscal year identifier
 * @returns Monthly expense totals in fiscal-year order and aggregate totals for the fiscal year
 */
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
