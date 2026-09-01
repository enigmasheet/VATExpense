import { db } from "@/lib/db";
import { expenses, parties, categories, locations, fiscalYears } from "@/lib/db/schema";
import { badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { normalizeMiti, NEPALI_MONTHS, type NepaliMonth } from "@/lib/nepali-date";
import { sanitizeCsvValue } from "@/lib/format";
import { and, eq, sql, type SQL } from "drizzle-orm";
import {
  HTTP_NOT_FOUND,
  CONTENT_TYPE_JSON,
  CONTENT_TYPE_CSV,
  CONTENT_TYPE_XLSX,
} from "@/lib/status-constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");
  const nepaliMonth = url.searchParams.get("nepaliMonth");
  const format = url.searchParams.get("format") || "standard";

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

    // Get company and fiscal year names for filename
    const [company] = await db
      .select({ name: sql<string>`(SELECT name FROM companies WHERE id = ${companyId})` })
      .from(expenses)
      .limit(1);

    const [fy] = await db
      .select({ name: fiscalYears.name })
      .from(fiscalYears)
      .where(eq(fiscalYears.id, fiscalYearId))
      .limit(1);

    const companyName = company?.name ?? "company";
    const fyName = fy?.name ?? "fy";

    const rows = await db
      .select({
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
      })
      .from(expenses)
      .leftJoin(parties, eq(expenses.partyId, parties.id))
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .leftJoin(locations, eq(expenses.locationId, locations.id))
      .where(where)
      .orderBy(sql`${expenses.miti} desc, ${expenses.createdAt} desc`);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No expenses found for this month" }),
        { status: HTTP_NOT_FOUND, headers: { "Content-Type": CONTENT_TYPE_JSON } },
      );
    }

    // CSV re-import format
    if (format === "reimport") {
      const data = rows.map((r, i) => ({
        Sno: i + 1,
        Miti: normalizeMiti(r.miti),
        "Invoice No": sanitizeCsvValue(r.invoiceNumber),
        Party: sanitizeCsvValue(r.partyName),
        Location: sanitizeCsvValue(r.locationName),
        "Vat No": sanitizeCsvValue(r.partyVatNumber),
        Category: sanitizeCsvValue(r.categoryName),
        Item: sanitizeCsvValue(r.item),
        Quantity: r.quantity ? Number(r.quantity) : "",
        Rate: r.rate ? Number(r.rate) : "",
        "Taxable Amount": Number(r.taxableAmount),
        "VAT Amount": Number(r.vatAmount),
        "Total Amount": Number(r.totalAmount),
      }));

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);

      return new Response(csv, {
        headers: {
          "Content-Type": CONTENT_TYPE_CSV,
          "Content-Disposition": `attachment; filename="vat-report-${companyName}-${fyName}-${nepaliMonth}.csv"`,
        },
      });
    }

    // Standard XLSX format
    const XLSX = await import("xlsx");

    const data = rows.map((r, i) => ({
      "S.N.": i + 1,
      Miti: r.miti,
      "Invoice No.": sanitizeCsvValue(r.invoiceNumber),
      Party: sanitizeCsvValue(r.partyName),
      "VAT No.": sanitizeCsvValue(r.partyVatNumber),
      Location: sanitizeCsvValue(r.locationName),
      Category: sanitizeCsvValue(r.categoryName),
      Item: sanitizeCsvValue(r.item),
      Qty: r.quantity ? Number(r.quantity) : 0,
      Rate: r.rate ? Number(r.rate) : 0,
      "Taxable Amount": Number(r.taxableAmount),
      "VAT Amount": Number(r.vatAmount),
      "Total Amount": Number(r.totalAmount),
      "VAT Rate %": Number(r.vatRate),
      Remarks: sanitizeCsvValue(r.remarks),
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

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nepaliMonth as string);

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      headers: {
        "Content-Type": CONTENT_TYPE_XLSX,
        "Content-Disposition": `attachment; filename="vat-report-${companyName}-${fyName}-${nepaliMonth}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/monthly failed", err);
    return internalError();
  }
}
