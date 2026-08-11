import { db } from "@/lib/db";
import { importBatches, importBatchRows } from "@/lib/db/schema";
import { apiOk, badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const maxBodySize = "10mb";

interface ParsedRow {
  miti: string;
  invoiceNumber: string | null;
  partyName: string;
  categoryName: string;
  locationName: string | null;
  item: string;
  quantity: string | null;
  rate: string | null;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatRate: string;
  remarks: string | null;
}

/**
 * Maps a spreadsheet row to the normalized import format.
 *
 * Empty rows produce `null`. Recognized fields are matched by case-insensitive
 * header text, with defaults applied for missing monetary values and VAT rate.
 *
 * @param row - Spreadsheet row keyed by its column headers
 * @returns The normalized row, or `null` when the row contains no values
 */
function mapExcelRow(row: Record<string, unknown>): ParsedRow | null {
  const values = Object.values(row).map((v) => (v === null || v === undefined ? "" : String(v).trim()));
  if (values.every((v) => v === "")) return null;

  const get = (header: string) => {
    const key = Object.keys(row).find((k) => k.toLowerCase().includes(header.toLowerCase()));
    return key ? String(row[key] ?? "").trim() : "";
  };

  return {
    miti: get("miti") || get("date"),
    invoiceNumber: get("invoice") || null,
    partyName: get("party") || get("supplier") || get("vendor"),
    categoryName: get("category") || "",
    locationName: get("location") || get("place") || null,
    item: get("item") || get("description") || "",
    quantity: get("qty") || get("quantity") || null,
    rate: get("rate") || null,
    taxableAmount: get("taxable") || get("taxable amount") || "0",
    vatAmount: get("vat") || get("vat amount") || "0",
    totalAmount: get("total") || get("total amount") || "0",
    vatRate: get("vat rate") || get("rate %") || "13",
    remarks: get("remarks") || null,
  };
}

/**
 * Imports spreadsheet data from a multipart form request and creates a pending import batch.
 *
 * @returns A response containing the created batch metadata, or an error response for invalid form data, empty workbook content, or processing failures.
 */
export async function POST(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Invalid form data");
  }

  const file = formData.get("file") as File | null;
  const fiscalYearId = formData.get("fiscalYearId") as string | null;

  if (!file) return badRequest("file is required");
  if (!fiscalYearId) return badRequest("fiscalYearId is required");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return badRequest("Excel file has no sheets");

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (jsonData.length === 0) {
      return badRequest("Excel file has no data rows");
    }

    const rows: ParsedRow[] = [];
    for (const row of jsonData) {
      const parsed = mapExcelRow(row);
      if (parsed) rows.push(parsed);
    }

    if (rows.length === 0) {
      return badRequest("No valid data rows found in Excel file");
    }

    const [batch] = await db
      .insert(importBatches)
      .values({
        companyId,
        fiscalYearId,
        filename: file.name,
        status: "pending",
        rowCount: rows.length,
      })
      .returning();

    const batchRows: Array<{
      batchId: string;
      rowIndex: number;
      status: string;
      rawMiti: string;
      rawInvoiceNumber: string | null;
      rawPartyName: string;
      rawCategoryName: string;
      rawItem: string;
      rawQuantity: string | null;
      rawRate: string | null;
      rawTaxableAmount: string;
      rawVatAmount: string;
      rawTotalAmount: string;
      rawVatRate: string;
      rawRemarks: string | null;
      rawLocationName: string | null;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      batchRows.push({
        batchId: batch.id,
        rowIndex: i + 1,
        status: "pending",
        rawMiti: row.miti,
        rawInvoiceNumber: row.invoiceNumber,
        rawPartyName: row.partyName,
        rawCategoryName: row.categoryName,
        rawItem: row.item,
        rawQuantity: row.quantity,
        rawRate: row.rate,
        rawTaxableAmount: row.taxableAmount,
        rawVatAmount: row.vatAmount,
        rawTotalAmount: row.totalAmount,
        rawVatRate: row.vatRate,
        rawRemarks: row.remarks,
        rawLocationName: row.locationName,
      });
    }

    await db.insert(importBatchRows).values(batchRows);

    return apiOk({
      data: {
        batchId: batch.id,
        filename: file.name,
        rowCount: rows.length,
        status: "pending",
      },
    }, 201);
  } catch (err) {
    console.error("POST /api/import/excel failed", err);
    return internalError();
  }
}
