import { db } from "@/lib/db";
import { expenses, categories, parties } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

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
 * Nepali month names in fiscal-year order (Shrawan first).
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

/**
 * Retrieves the purchase totals per party for a fiscal year, keeping only parties
 * whose purchases exceed the given threshold (based on the selected amount basis).
 *
 * @param companyId - The identifier of the company
 * @param fiscalYearId - The identifier of the fiscal year
 * @param basis - Which amount column drives the threshold filter and ordering
 * @param threshold - Minimum purchase total (inclusive comparison uses strict >) to include a party
 * @returns The qualifying parties with their aggregated expense totals
 */
export async function getPartyPurchaseReport(
  companyId: string,
  fiscalYearId: string,
  basis: "taxable" | "total",
  threshold = 100000,
) {
  const basisColumn =
    basis === "taxable" ? expenses.taxableAmount : expenses.totalAmount;

  return db
    .select({
      partyId: parties.id,
      partyName: parties.name,
      vatNumber: parties.vatNumber,
      expenseCount: sql<number>`count(*)::int`,
      totalTaxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      totalVatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
    })
    .from(expenses)
    .innerJoin(parties, eq(parties.id, expenses.partyId))
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.isDeleted, false),
      ),
    )
    .groupBy(parties.id, parties.name, parties.vatNumber)
    .having(sql`sum(${basisColumn}::numeric) > ${threshold}`)
    .orderBy(sql`sum(${basisColumn}::numeric) desc`);
}
