import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { apiOk, badRequest, internalError } from "@/lib/api-response";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { and, eq, sql, type SQL } from "drizzle-orm";

/**
 * Generates a fiscal-year expense report for a company.
 *
 * @param request - Request containing the `companyId` and `fiscalYearId` query parameters
 * @returns A response containing monthly expense aggregates and fiscal-year totals
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  const fiscalYearId = url.searchParams.get("fiscalYearId");

  if (!companyId) return badRequest("companyId query parameter is required");
  if (!fiscalYearId) return badRequest("fiscalYearId query parameter is required");

  const conditions: SQL[] = [
    eq(expenses.companyId, companyId),
    eq(expenses.fiscalYearId, fiscalYearId),
    eq(expenses.isDeleted, false),
  ];

  try {
    const where = and(...conditions);

    const monthlyBreakdown = await db
      .select({
        nepaliMonth: expenses.nepaliMonth,
        totalTaxableAmount: sql<string>`COALESCE(SUM(${expenses.taxableAmount}), 0)`,
        totalVatAmount: sql<string>`COALESCE(SUM(${expenses.vatAmount}), 0)`,
        totalAmount: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)`,
        expenseCount: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(where)
      .groupBy(expenses.nepaliMonth)
      .orderBy(sql`ARRAY_POSITION(ARRAY[${sql.join(NEPALI_MONTHS.map((m) => sql`${m}`), sql`, `)}]::text[], ${expenses.nepaliMonth})`);

    const totals = await db
      .select({
        totalTaxableAmount: sql<string>`COALESCE(SUM(${expenses.taxableAmount}), 0)`,
        totalVatAmount: sql<string>`COALESCE(SUM(${expenses.vatAmount}), 0)`,
        totalAmount: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)`,
        expenseCount: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(where);

    const monthMap = new Map(
      monthlyBreakdown.map((row) => [
        row.nepaliMonth,
        {
          totalTaxableAmount: row.totalTaxableAmount,
          totalVatAmount: row.totalVatAmount,
          totalAmount: row.totalAmount,
          expenseCount: row.expenseCount,
        },
      ]),
    );

    const allMonths = NEPALI_MONTHS.map((month) => ({
      nepaliMonth: month,
      totalTaxableAmount: monthMap.get(month)?.totalTaxableAmount ?? "0",
      totalVatAmount: monthMap.get(month)?.totalVatAmount ?? "0",
      totalAmount: monthMap.get(month)?.totalAmount ?? "0",
      expenseCount: monthMap.get(month)?.expenseCount ?? 0,
    }));

    return apiOk({
      data: {
        fiscalYearId,
        companyId,
        months: allMonths,
        totals: {
          totalTaxableAmount: totals[0].totalTaxableAmount,
          totalVatAmount: totals[0].totalVatAmount,
          totalAmount: totals[0].totalAmount,
          expenseCount: totals[0].expenseCount,
        },
      },
    });
  } catch (err) {
    console.error("GET /api/reports/fiscal-year failed", err);
    return internalError();
  }
}
