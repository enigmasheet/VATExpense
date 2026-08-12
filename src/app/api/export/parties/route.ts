import { getPartyPurchaseReport } from "@/lib/server-data";
import { badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { PARTY_PURCHASE_THRESHOLD } from "@/lib/constants";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const THRESHOLD = PARTY_PURCHASE_THRESHOLD;

/**
 * Exports the parties with purchases over the threshold as an Excel report.
 *
 * @param request - Request containing the company, fiscal year, and amount basis query parameters
 * @returns A downloadable XLSX response of qualifying parties and their purchase totals.
 */
export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");
  const basisParam = url.searchParams.get("basis");

  if (!fiscalYearId) return badRequest("fiscalYearId query parameter is required");
  if (basisParam !== "taxable" && basisParam !== "total") {
    return badRequest("basis query parameter must be either 'taxable' or 'total'");
  }

  const basis = basisParam as "taxable" | "total";

  try {
    const rows = await getPartyPurchaseReport(companyId, fiscalYearId, basis, THRESHOLD);

    const data = rows.map((r, i) => ({
      "S.N.": i + 1,
      "Party": r.partyName,
      "VAT No.": r.vatNumber ?? "",
      "Transactions": r.expenseCount,
      "Taxable Amount": Number(r.totalTaxableAmount),
      "VAT Amount": Number(r.totalVatAmount),
      "Total Amount": Number(r.totalAmount),
    }));

    const totals = rows.reduce(
      (acc, r) => ({
        transactions: acc.transactions + r.expenseCount,
        taxable: acc.taxable + Number(r.totalTaxableAmount),
        vat: acc.vat + Number(r.totalVatAmount),
        total: acc.total + Number(r.totalAmount),
      }),
      { transactions: 0, taxable: 0, vat: 0, total: 0 },
    );

    data.push({
      "S.N.": 0,
      "Party": "TOTAL",
      "VAT No.": "",
      "Transactions": totals.transactions,
      "Taxable Amount": totals.taxable,
      "VAT Amount": totals.vat,
      "Total Amount": totals.total,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 5 }, // S.N.
      { wch: 25 }, // Party
      { wch: 14 }, // VAT No.
      { wch: 13 }, // Transactions
      { wch: 16 }, // Taxable Amount
      { wch: 14 }, // VAT Amount
      { wch: 16 }, // Total Amount
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Party Purchases");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="party-purchase-report-${basis}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/parties failed", err);
    return internalError();
  }
}
