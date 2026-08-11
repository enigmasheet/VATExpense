import { db } from "@/lib/db";
import { expenses, categories } from "@/lib/db/schema";
import { badRequest, internalError } from "@/lib/api-response";
import { NEPALI_MONTHS, type NepaliMonth } from "@/lib/nepali-date";
import { and, eq, sql, type SQL } from "drizzle-orm";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

/**
 * Exports the selected month's non-deleted expenses as an Excel VAT report.
 *
 * @returns A downloadable XLSX response containing expense details and totals, or an error response for invalid parameters or processing failures.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  const fiscalYearId = url.searchParams.get("fiscalYearId");
  const nepaliMonth = url.searchParams.get("nepaliMonth");

  if (!companyId) return badRequest("companyId query parameter is required");
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

    const rows = await db
      .select({
        miti: expenses.miti,
        invoiceNumber: expenses.invoiceNumber,
        partyName: sql<string>`COALESCE((SELECT name FROM parties WHERE id = ${expenses.partyId}), '')`,
        categoryName: sql<string>`COALESCE((SELECT name FROM categories WHERE id = ${expenses.categoryId}), '')`,
        item: expenses.item,
        quantity: expenses.quantity,
        rate: expenses.rate,
        taxableAmount: expenses.taxableAmount,
        vatAmount: expenses.vatAmount,
        totalAmount: expenses.totalAmount,
        vatRate: expenses.vatRate,
        remarks: expenses.remarks,
      })
      .from(expenses)
      .where(where)
      .orderBy(sql`${expenses.miti} desc, ${expenses.createdAt} desc`);

    const data = rows.map((r, i) => ({
      "S.N.": i + 1,
      "Miti": r.miti,
      "Invoice No.": r.invoiceNumber ?? "",
      "Party": r.partyName,
      "Category": r.categoryName,
      "Item": r.item,
      "Qty": r.quantity ? Number(r.quantity) : 0,
      "Rate": r.rate ? Number(r.rate) : 0,
      "Taxable Amount": Number(r.taxableAmount),
      "VAT Amount": Number(r.vatAmount),
      "Total Amount": Number(r.totalAmount),
      "VAT Rate %": Number(r.vatRate),
      "Remarks": r.remarks ?? "",
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
      "Miti": "",
      "Invoice No.": "",
      "Party": "",
      "Category": "",
      "Item": "TOTAL",
      "Qty": 0,
      "Rate": 0,
      "Taxable Amount": totals.taxable,
      "VAT Amount": totals.vat,
      "Total Amount": totals.total,
      "VAT Rate %": 0,
      "Remarks": "",
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 5 },   // S.N.
      { wch: 12 },  // Miti
      { wch: 12 },  // Invoice No.
      { wch: 20 },  // Party
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

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nepaliMonth as string);

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="vat-report-${nepaliMonth}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/monthly failed", err);
    return internalError();
  }
}
