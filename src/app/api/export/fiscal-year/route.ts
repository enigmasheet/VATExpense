import { db } from "@/lib/db";
import { expenses, parties, categories, locations, fiscalYears } from "@/lib/db/schema";
import { badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { and, eq, sql, type SQL } from "drizzle-orm";
import {
  HTTP_NOT_FOUND,
  CONTENT_TYPE_JSON,
  CONTENT_TYPE_CSV,
  CONTENT_TYPE_XLSX,
  RUNTIME_NODEJS,
} from "@/lib/status-constants";

export const runtime = RUNTIME_NODEJS;

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");
  const detail = url.searchParams.get("detail") === "true";
  const format = url.searchParams.get("format") || "xlsx";

  if (!fiscalYearId) return badRequest("fiscalYearId query parameter is required");

  const conditions: SQL[] = [
    eq(expenses.companyId, companyId),
    eq(expenses.fiscalYearId, fiscalYearId),
    eq(expenses.isDeleted, false),
  ];

  try {
    // Get company and fiscal year names for filename
    const [fy] = await db
      .select({ name: fiscalYears.name })
      .from(fiscalYears)
      .where(eq(fiscalYears.id, fiscalYearId))
      .limit(1);

    const fyName = fy?.name ?? "fy";

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    if (detail) {
      // Detailed export - fetch all expenses in ONE query, group by month in JS
      const allRows = await db
        .select({
          nepaliMonth: expenses.nepaliMonth,
          miti: expenses.miti,
          invoiceNumber: expenses.invoiceNumber,
          partyName: parties.name,
          partyVatNumber: parties.vatNumber,
          categoryName: categories.name,
          locationName: locations.name,
          item: expenses.item,
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
        .leftJoin(parties, eq(expenses.partyId, parties.id))
        .leftJoin(categories, eq(expenses.categoryId, categories.id))
        .leftJoin(locations, eq(expenses.locationId, locations.id))
        .where(and(...conditions))
        .orderBy(sql`${expenses.miti} desc, ${expenses.createdAt} desc`);

      // Group by month in JS
      const monthGroups = new Map<string, typeof allRows>();
      for (const row of allRows) {
        const month = row.nepaliMonth;
        if (!monthGroups.has(month)) monthGroups.set(month, []);
        monthGroups.get(month)!.push(row);
      }

      for (const month of NEPALI_MONTHS) {
        const rows = monthGroups.get(month);
        if (!rows || rows.length === 0) continue;

        const data = rows.map((r, i) => ({
          "S.N.": i + 1,
          Miti: r.miti,
          "Invoice No.": r.invoiceNumber ?? "",
          Party: r.partyName ?? "",
          "VAT No.": r.partyVatNumber ?? "",
          Location: r.locationName ?? "",
          Category: r.categoryName ?? "",
          Item: r.item,
          Qty: r.quantity ? Number(r.quantity) : 0,
          Rate: r.rate ? Number(r.rate) : 0,
          "Taxable Amount": Number(r.taxableAmount),
          "VAT Amount": Number(r.vatAmount),
          "Total Amount": Number(r.totalAmount),
          "VAT Rate %": Number(r.vatRate),
          Remarks: r.remarks ?? "",
        }));

        const totals = rows.reduce(
          (acc, r) => ({
            taxable: acc.taxable + Number(r.taxableAmount),
            vat: acc.vat + Number(r.vatAmount),
            total: acc.total + Number(r.totalAmount),
          }),
          { taxable: 0, vat: 0, total: 0 },
        );

        data.push({
          "S.N.": 0,
          Miti: "",
          "Invoice No.": "",
          Party: "",
          "VAT No.": "",
          Location: "",
          Category: "",
          Item: "TOTAL",
          Qty: 0,
          Rate: 0,
          "Taxable Amount": totals.taxable,
          "VAT Amount": totals.vat,
          "Total Amount": totals.total,
          "VAT Rate %": 0,
          Remarks: "",
        });

        const ws = XLSX.utils.json_to_sheet(data);
        ws["!cols"] = [
          { wch: 5 },   // S.N.
          { wch: 12 },  // Miti
          { wch: 12 },  // Invoice No.
          { wch: 25 },  // Party
          { wch: 14 },  // VAT No.
          { wch: 15 },  // Location
          { wch: 15 },  // Category
          { wch: 25 },  // Item
          { wch: 8 },   // Qty
          { wch: 10 },  // Rate
          { wch: 14 },  // Taxable Amount
          { wch: 12 },  // VAT Amount
          { wch: 14 },  // Total Amount
          { wch: 10 },  // VAT Rate %
          { wch: 20 },  // Remarks
        ];

        XLSX.utils.book_append_sheet(wb, ws, month);
      }
    } else {
      // Summary export - one sheet with monthly totals
      const monthlyData = await db
        .select({
          nepaliMonth: expenses.nepaliMonth,
          totalTaxableAmount: sql<string>`COALESCE(SUM(${expenses.taxableAmount}), 0)`,
          totalVatAmount: sql<string>`COALESCE(SUM(${expenses.vatAmount}), 0)`,
          totalAmount: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)`,
          expenseCount: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(and(...conditions))
        .groupBy(expenses.nepaliMonth);

      if (monthlyData.length === 0) {
        return new Response(
          JSON.stringify({ error: "No expenses found for this fiscal year" }),
          { status: HTTP_NOT_FOUND, headers: { "Content-Type": CONTENT_TYPE_JSON } },
        );
      }

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

      const rows: Array<{
        Month: string;
        Expenses: number;
        "Taxable Amount": number;
        "VAT Amount": number;
        "Total Amount": number;
      }> = NEPALI_MONTHS.map((month) => {
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

      XLSX.utils.book_append_sheet(wb, ws, "Fiscal Year");
    }

    // CSV format
    if (format === "csv") {
      const ws = wb.Sheets[wb.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new Response(csv, {
        headers: {
          "Content-Type": CONTENT_TYPE_CSV,
          "Content-Disposition": `attachment; filename="fiscal-year-report-${fyName}${detail ? "-detail" : ""}.csv"`,
        },
      });
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      headers: {
        "Content-Type": CONTENT_TYPE_XLSX,
        "Content-Disposition": `attachment; filename="fiscal-year-report-${fyName}${detail ? "-detail" : ""}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/fiscal-year failed", err);
    return internalError();
  }
}
