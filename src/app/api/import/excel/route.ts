import { db } from "@/lib/db";
import { importBatches, importBatchRows, fiscalYears } from "@/lib/db/schema";
import { apiOk, badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { VAT_RATE, BATCH_SIZE_LIMIT } from "@/lib/constants";
import {
  BATCH_STATUS_PENDING,
  BATCH_ROW_STATUS_PENDING,
  HTTP_CREATED,
  MAX_IMPORT_FILE_SIZE,
  IMPORT_DATE_FORMAT,
  ALLOWED_IMPORT_EXTENSIONS,
} from "@/lib/status-constants";
import * as XLSX from "xlsx";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";

interface ParsedRow {
  miti: string;
  invoiceNumber: string | null;
  partyName: string;
  categoryName: string;
  locationName: string | null;
  vatNumber: string | null;
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

  const normalizeHeader = (s: string) =>
    s.toLowerCase().replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();

  const get = (header: string) => {
    const normalizedSearch = header.toLowerCase();
    const key = Object.keys(row).find((k) => normalizeHeader(k).includes(normalizedSearch));
    return key ? String(row[key] ?? "").trim() : "";
  };

  const miti = get("miti") || get("date");
  const partyName = get("party") || get("supplier") || get("vendor");

  // Skip summary/total rows (rows without miti and party, or containing "total")
  if (!miti && !partyName) return null;
  if (partyName.toLowerCase().includes("total")) return null;

  return {
    miti,
    invoiceNumber: get("invoice") || null,
    partyName,
    categoryName: get("category") || "",
    locationName: get("location") || get("place") || null,
    vatNumber: get("vat") || get("vat no") || get("vat number") || null,
    item: get("item") || get("description") || "",
    quantity: get("qty") || get("quantity") || null,
    rate: get("rate") || null,
    taxableAmount: get("taxable") || get("taxable amount") || "0",
    vatAmount: get("vat amount") || get("vat amt") || "0",
    totalAmount: get("total") || get("total amount") || "0",
    vatRate: get("vat rate") || get("rate %") || String(VAT_RATE),
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

  // Validate file size
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return badRequest(`File size exceeds the maximum of ${Math.round(MAX_IMPORT_FILE_SIZE / 1024 / 1024)}MB`);
  }

  // Validate fiscalYearId exists and belongs to this company
  const [fy] = await db
    .select({ id: fiscalYears.id })
    .from(fiscalYears)
    .where(and(eq(fiscalYears.id, fiscalYearId), eq(fiscalYears.companyId, companyId)))
    .limit(1);
  if (!fy) return badRequest("Invalid fiscal year for this company");

  // Validate file extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_IMPORT_EXTENSIONS.includes(ext || "")) {
    return badRequest("File must be .xlsx, .xls, or .csv");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const isExcel = ext === "xlsx" || ext === "xls";
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      ...(isExcel ? { dateNF: IMPORT_DATE_FORMAT } : { raw: true }),
    });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return badRequest("File has no sheets");

    // Multi-sheet warning
    const warnings: string[] = [];
    if (workbook.SheetNames.length > 1) {
      warnings.push(
        `File has ${workbook.SheetNames.length} sheets; only "${sheetName}" will be imported`,
      );
    }

    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      raw: false,
    });

    if (jsonData.length === 0) {
      return badRequest("File has no data rows");
    }

    const rows: ParsedRow[] = [];
    for (const row of jsonData) {
      const parsed = mapExcelRow(row);
      if (parsed) rows.push(parsed);
    }

    if (rows.length === 0) {
      return badRequest("No valid data rows found in file");
    }

    if (rows.length > BATCH_SIZE_LIMIT) {
      return badRequest(`File exceeds the maximum of ${BATCH_SIZE_LIMIT} rows`);
    }

    const [batch] = await db
      .insert(importBatches)
      .values({
        companyId,
        fiscalYearId,
        filename: file.name,
        status: BATCH_STATUS_PENDING,
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
      rawVatNumber: string | null;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      batchRows.push({
        batchId: batch.id,
        rowIndex: i + 1,
        status: BATCH_ROW_STATUS_PENDING,
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
        rawVatNumber: row.vatNumber,
      });
    }

    await db.insert(importBatchRows).values(batchRows);

    return apiOk({
      data: {
        batchId: batch.id,
        filename: file.name,
        rowCount: rows.length,
        status: BATCH_STATUS_PENDING,
        warnings,
      },
    }, HTTP_CREATED);
  } catch (err) {
    console.error("POST /api/import/excel failed", err);
    return internalError();
  }
}
