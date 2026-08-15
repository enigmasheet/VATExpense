import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { apiOk, badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { and, eq, sql, type SQL } from "drizzle-orm";

/**
 * Generates a fiscal-year expense report for a company.
 *
 * @param request - Request containing the `companyId` and `fiscalYearId` query parameters
 * @returns A response containing monthly expense aggregates and fiscal-year totals
 */
export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");

  if (!fiscalYearId) return badRequest("fiscalYearId query parameter is required");

  const conditions: SQL[] = [
    eq(expenses.companyId, companyId),
    eq(expenses.fiscalYearId, fiscalYearId),
    eq(expenses.isDeleted, false),
  ];

  try {
    const where = and(...conditions);

    // Single query - compute totals from monthly breakdown in JS
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

    // Compute totals from monthly breakdown (single query instead of two)
    const totals = monthlyBreakdown.reduce(
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
        fiscalYearId,
        companyId,
        months: allMonths,
        totals,
      },
    });
  } catch (err) {
    console.error("GET /api/reports/fiscal-year failed", err);
    return internalError();
  }
}
