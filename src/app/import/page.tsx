"use client";

import { useState, useRef, useCallback } from "react";
import { useApp } from "@/lib/use-app";
import { api, ApiError } from "@/lib/api-client";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

interface BatchRow {
  id: string;
  rowIndex: number;
  status: string;
  raw: {
    miti: string;
    invoiceNumber: string | null;
    partyName: string;
    categoryName: string;
    item: string;
    quantity: string | null;
    rate: string | null;
    taxableAmount: string;
    vatAmount: string;
    totalAmount: string;
    remarks: string | null;
  };
  resolved: {
    partyId: string | null;
    partyName: string | null;
    categoryId: string | null;
    categoryName: string | null;
    miti: string | null;
    nepaliMonth: string | null;
    taxableAmount: string;
    vatAmount: string;
    totalAmount: string;
    vatRate: string;
  };
  errors: string[];
}

interface BatchPreview {
  batchId: string;
  filename: string;
  status: string;
  rowCount: number;
  errorCount: number;
  rows: BatchRow[];
}

interface ImportResult {
  batchId: string;
  status: string;
  importedCount: number;
}

/**
 * Renders the expense import page for uploading, previewing, and confirming Excel expense data.
 */
export default function ImportPage() {
  const { companyId, fiscalYearId, loading } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<BatchPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);

  const handleFileChange = useCallback(() => {
    setHasFile(!!fileRef.current?.files?.[0]);
  }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !companyId || !fiscalYearId) return;

    setUploading(true);
    setError(null);
    setPreview(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);
      formData.append("fiscalYearId", fiscalYearId);

      const data = await api<{ data: { batchId: string } }>("/api/import/excel", {
        method: "POST",
        body: formData,
      });

      const previewData = await api<{ data: BatchPreview }>(
        `/api/import/${data.data.batchId}/preview`,
      );
      setPreview(previewData.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;

    setConfirming(true);
    setError(null);

    try {
      const data = await api<{ data: ImportResult }>(
        `/api/import/${preview.batchId}/confirm`,
        { method: "POST" },
      );
      setResult(data.data);
      setPreview(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!companyId || !fiscalYearId) {
    return (
      <p className="text-sm text-muted">
        Select a company and fiscal year to import expenses.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Import Expenses
        </h1>
        <p className="mt-1 text-sm text-muted">
          Upload an Excel file with your expense data
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="file-upload">
              Excel File (.xlsx, .xls)
            </label>
            <input
              id="file-upload"
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !hasFile}
          >
            {uploading ? "Uploading…" : "Upload & Preview"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <div className="rounded-lg border border-success bg-success/10 p-4">
          <p className="text-sm font-medium text-success">
            Successfully imported {result.importedCount} expense(s)
          </p>
        </div>
      )}

      {preview && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Preview: {preview.filename}
              </h2>
              <p className="text-sm text-muted">
                {preview.rowCount} rows · {preview.errorCount} errors
              </p>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={confirming || preview.errorCount === preview.rowCount}
            >
              {confirming ? "Confirming…" : `Confirm Import (${preview.rowCount - preview.errorCount} valid)`}
            </Button>
          </div>

          <DataTable
            variant="desktop-only"
            compact
            rowClassName={(row) => (row.status === "error" ? "bg-danger/5" : "")}
            columns={[
              {
                header: "#",
                cell: (row) => <span className="text-muted">{row.rowIndex}</span>,
              },
              {
                header: "Status",
                cell: (row) => (
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                      row.status === "valid"
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {row.status}
                  </span>
                ),
              },
              { header: "Miti", cell: (row) => row.raw.miti },
              { header: "Invoice", cell: (row) => row.raw.invoiceNumber ?? "—" },
              {
                header: "Party",
                cell: (row) =>
                  row.resolved.partyName ?? (
                    <span className="text-danger">{row.raw.partyName}</span>
                  ),
              },
              {
                header: "Category",
                cell: (row) =>
                  row.resolved.categoryName ?? (
                    <span className="text-danger">{row.raw.categoryName}</span>
                  ),
              },
              { header: "Item", cell: (row) => row.raw.item },
              {
                header: "Taxable",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount">{formatAmount(row.raw.taxableAmount)}</span>
                ),
              },
              {
                header: "VAT",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount">{formatAmount(row.raw.vatAmount)}</span>
                ),
              },
              {
                header: "Total",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount">{formatAmount(row.raw.totalAmount)}</span>
                ),
              },
              {
                header: "Errors",
                cell: (row) =>
                  row.errors.length > 0 && (
                    <ul className="list-disc text-xs text-danger">
                      {row.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  ),
              },
            ]}
            rows={preview.rows}
            getKey={(row) => row.id}
          />
        </div>
      )}
    </div>
  );
}
