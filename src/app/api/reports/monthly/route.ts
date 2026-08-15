import { db } from "@/lib/db";
import { expenses, categories } from "@/lib/db/schema";
import { apiOk, badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { NEPALI_MONTHS, type NepaliMonth } from "@/lib/nepali-date";
import { and, eq, sql, type SQL } from "drizzle-orm";

/**
 * Generates a monthly expense report for a company and fiscal year.
 *
 * @param request - The request containing company, fiscal year, and Nepali month query parameters
 * @returns The category breakdown and aggregate totals for the specified month
 */
export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");
  const nepaliMonth = url.searchParams.get("nepaliMonth");

  if (!fiscalYearId) return badRequest("fiscalYearId query parameter is required");
  if (!nepaliMonth) return badRequest("nepaliMonth query parameter is required");
  if (!NEPALI_MONTHS.includes(nepaliMonth as NepaliMonth)) {
    return badRequest(`nepaliMonth must be one of: ${NEPALI_MONTHS.join(", ")}`);
  }

  const conditions: SQL[] = [
    eq(expenses.companyId, companyId),
    eq(expenses.fiscalYearId, fiscalYearId),
    eq(expenses.nepaliMonth, nepaliMonth as NepaliMonth),
    eq(expenses.isDeleted, false),
  ];

  try {
    const where = and(...conditions);

    // Single query with category grouping - compute totals from rows in JS
    const categoryBreakdown = await db
      .select({
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        totalTaxableAmount: sql<string>`COALESCE(SUM(${expenses.taxableAmount}), 0)`,
        totalVatAmount: sql<string>`COALESCE(SUM(${expenses.vatAmount}), 0)`,
        totalAmount: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)`,
        expenseCount: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .leftJoin(categories, eq(categories.id, expenses.categoryId))
      .where(where)
      .groupBy(expenses.categoryId, categories.name)
      .orderBy(sql`SUM(${expenses.totalAmount}) DESC`);

    // Compute totals from category breakdown (single query instead of two)
    const totals = categoryBreakdown.reduce(
      (acc, row) => ({
        totalTaxableAmount: String(Number(acc.totalTaxableAmount) + Number(row.totalTaxableAmount)),
        totalVatAmount: String(Number(acc.totalVatAmount) + Number(row.totalVatAmount)),
        totalAmount: String(Number(acc.totalAmount) + Number(row.totalAmount)),
        expenseCount: acc.expenseCount + row.expenseCount,
      }),
      { totalTaxableAmount: "0", totalVatAmount: "0", totalAmount: "0", expenseCount: 0 },
    );

    return apiOk({
      data: {
        nepaliMonth,
        fiscalYearId,
        companyId,
        categories: categoryBreakdown,
        totals,
      },
    });
  } catch (err) {
    console.error("GET /api/reports/monthly failed", err);
    return internalError();
  }
}
