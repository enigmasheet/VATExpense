import { badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { getPartyStatement } from "@/lib/server-data/party-statement";
import { normalizeMiti } from "@/lib/nepali-date";
import { sanitizeCsvValue } from "@/lib/format";
import {
  HTTP_NOT_FOUND,
  CONTENT_TYPE_JSON,
  CONTENT_TYPE_CSV,
  CONTENT_TYPE_XLSX,
} from "@/lib/status-constants";

export const runtime = "nodejs";

/**
 * Exports the per-party statement as an Excel or CSV file.
 *
 * @param request - Request containing partyId in params and fiscalYearId query param
 * @returns A downloadable XLSX/CSV response with all transactions for the party in the fiscal year.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: partyId } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");
  const format = url.searchParams.get("format") || "xlsx";

  if (!fiscalYearId) return badRequest("fiscalYearId query parameter is required");

  try {
    const { summary, rows } = await getPartyStatement(companyId, partyId, fiscalYearId);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transactions found for this party" }),
        { status: HTTP_NOT_FOUND, headers: { "Content-Type": CONTENT_TYPE_JSON } },
      );
    }

    const XLSX = await import("xlsx");

    const data = rows.map((r, i) => ({
      "S.N.": i + 1,
      Miti: normalizeMiti(r.miti),
      "Invoice No.": sanitizeCsvValue(r.invoiceNumber),
      Item: sanitizeCsvValue(r.itemName),
      Category: sanitizeCsvValue(r.categoryName),
      Location: sanitizeCsvValue(r.locationName),
      Qty: r.quantity ? Number(r.quantity) : 0,
      Rate: r.rate ? Number(r.rate) : 0,
      "Taxable Amount": Number(r.taxableAmount),
      "VAT Amount": Number(r.vatAmount),
      "Total Amount": Number(r.totalAmount),
      "VAT Rate %": Number(r.vatRate),
      Remarks: sanitizeCsvValue(r.remarks),
    }));

    // Add totals row
    data.push({
      "S.N.": 0,
      Miti: "",
      "Invoice No.": "",
      Item: "TOTAL",
      Category: "",
      Location: "",
      Qty: 0,
      Rate: 0,
      "Taxable Amount": Number(summary.totalTaxableAmount),
      "VAT Amount": Number(summary.totalVatAmount),
      "Total Amount": Number(summary.totalAmount),
      "VAT Rate %": 0,
      Remarks: "",
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 5 },   // S.N.
      { wch: 12 },  // Miti
      { wch: 12 },  // Invoice No.
      { wch: 25 },  // Item
      { wch: 15 },  // Category
      { wch: 15 },  // Location
      { wch: 8 },   // Qty
      { wch: 10 },  // Rate
      { wch: 14 },  // Taxable Amount
      { wch: 12 },  // VAT Amount
      { wch: 14 },  // Total Amount
      { wch: 10 },  // VAT Rate %
      { wch: 20 },  // Remarks
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = `Statement - ${summary.partyName}`.substring(0, 31); // XLSX max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const safeName = summary.partyName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
    const fileName = `${safeName}-statement-${summary.fiscalYearName}`;

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new Response(csv, {
        headers: {
          "Content-Type": CONTENT_TYPE_CSV,
          "Content-Disposition": `attachment; filename="${fileName}.csv"`,
        },
      });
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      headers: {
        "Content-Type": CONTENT_TYPE_XLSX,
        "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/parties/[id] failed", err);
    return internalError();
  }
}
