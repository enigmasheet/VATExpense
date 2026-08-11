import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { and, eq, sql, type SQL } from "drizzle-orm";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

/**
 * Exports non-deleted fiscal-year expenses as an Excel workbook grouped by Nepali month.
 *
 * @param request - Request containing the `companyId` and `fiscalYearId` query parameters
 * @returns An Excel file response, or an error response when the required parameters or export operation are invalid
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

    const monthlyData = await db
      .select({
        nepaliMonth: expenses.nepaliMonth,
        totalTaxableAmount: sql<string>`COALESCE(SUM(${expenses.taxableAmount}), 0)`,
        totalVatAmount: sql<string>`COALESCE(SUM(${expenses.vatAmount}), 0)`,
        totalAmount: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)`,
        expenseCount: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(where)
      .groupBy(expenses.nepaliMonth);

    const monthMap = new Map(
      monthlyData.map((row) => [
        row.nepaliMonth,
        {
          taxable: Number(row.totalTaxableAmount),
          vat: Number(row.totalVatAmount),
          total: Number(row.totalAmount),
          count: row.expenseCount,
        },
      ]),
    );

    const totals = monthlyData.reduce(
      (acc, r) => ({
        expenses: acc.expenses + r.expenseCount,
        taxable: acc.taxable + Number(r.totalTaxableAmount),
        vat: acc.vat + Number(r.totalVatAmount),
        total: acc.total + Number(r.totalAmount),
      }),
      { expenses: 0, taxable: 0, vat: 0, total: 0 },
    );

    const rows: Array<{ Month: string; Expenses: number; "Taxable Amount": number; "VAT Amount": number; "Total Amount": number }> = NEPALI_MONTHS.map((month) => {
      const m = monthMap.get(month);
      return {
        Month: month,
        Expenses: m?.count ?? 0,
        "Taxable Amount": m?.taxable ?? 0,
        "VAT Amount": m?.vat ?? 0,
        "Total Amount": m?.total ?? 0,
      };
    });

    rows.push({
      Month: "TOTAL",
      Expenses: totals.expenses,
      "Taxable Amount": totals.taxable,
      "VAT Amount": totals.vat,
      "Total Amount": totals.total,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 },  // Month
      { wch: 10 },  // Expenses
      { wch: 16 },  // Taxable Amount
      { wch: 14 },  // VAT Amount
      { wch: 16 },  // Total Amount
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fiscal Year");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="vat-fiscal-year-report.xlsx"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/fiscal-year failed", err);
    return internalError();
  }
}
