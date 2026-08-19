"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useApp } from "@/lib/useApp";
import { api, ApiError } from "@/lib/api-client";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/status-widgets";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert } from "@/components/ui/alert";

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
  warnings: string[];
  suggestions: {
    party?: string;
    category?: string;
  };
}

interface BatchPreview {
  batchId: string;
  filename: string;
  status: string;
  rowCount: number;
  errorCount: number;
  warningCount: number;
  rows: BatchRow[];
  created?: {
    parties: number;
    categories: number;
    locations: number;
  };
}

interface ImportResult {
  batchId: string;
  status: string;
  importedCount: number;
}

interface UploadResponse {
  batchId: string;
  filename: string;
  rowCount: number;
  status: string;
  warnings?: string[];
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
  const [autoCreate, setAutoCreate] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);

  const handleFileChange = useCallback(() => {
    setHasFile(!!fileRef.current?.files?.[0]);
  }, []);

  const downloadTemplate = useCallback(() => {
    const headers = [
      "Sno",
      "Miti",
      "Invoice No",
      "Party",
      "Location",
      "Vat No",
      "Item",
      "Quantity",
      "Rate",
      "Taxable Amount",
      "VAT Amount",
      "Total Amount",
    ];
    const sampleRow = [
      "1",
      "01/11/2082",
      "3217",
      "dinbandhu oil and trading house",
      "birgunj",
      "300035058",
      "diesel",
      "42.84",
      "120.8",
      "5175.07",
      "672.76",
      "5848",
    ];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expense-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !companyId || !fiscalYearId) return;

    // Client-side file validation
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Invalid file type. Please upload a ${ALLOWED_EXTENSIONS.join(", ")} file.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    setUploading(true);
    setError(null);
    setPreview(null);
    setResult(null);
    setUploadWarnings([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);
      formData.append("fiscalYearId", fiscalYearId);

      const data = await api<{ data: UploadResponse }>("/api/import/excel", {
        method: "POST",
        body: formData,
      });
      setUploadWarnings(data.data.warnings || []);

      const previewData = await api<{ data: BatchPreview }>(
        `/api/import/${data.data.batchId}/preview?autoCreate=${autoCreate}`,
      );
      setPreview(previewData.data);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.detail
          : "Upload failed. Please check that the file is a valid .xlsx, .xls, or .csv file."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;

    setConfirming(true);
    setError(null);
    setShowConfirmDialog(false);

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

  const handleCancel = useCallback(() => {
    setPreview(null);
    setResult(null);
    setError(null);
    setUploadWarnings([]);
    setHasFile(false);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }, []);

  // Compute issue breakdown from preview rows
  const issueBreakdown = useMemo(() => {
    if (!preview) return null;
    const rows = preview.rows;
    const partyErrors = rows.filter((r) => r.errors.some((e) => e.startsWith("Party"))).length;
    const categoryErrors = rows.filter((r) => r.errors.some((e) => e.startsWith("Category"))).length;
    const mitiErrors = rows.filter((r) => r.errors.some((e) => e.includes("miti"))).length;
    const amountErrors = rows.filter((r) => r.errors.some((e) => e.includes("amount") || e.includes("Amount"))).length;
    const duplicateWarnings = rows.filter((r) => r.warnings.some((w) => w.startsWith("Duplicate"))).length;
    const amountWarnings = rows.filter((r) => r.warnings.some((w) => w.includes("mismatch"))).length;
    const autoCreateWarnings = rows.filter((r) => r.warnings.some((w) => w.includes("will be created"))).length;

    return {
      partyErrors,
      categoryErrors,
      mitiErrors,
      amountErrors,
      duplicateWarnings,
      amountWarnings,
      autoCreateWarnings,
      hasIssues: partyErrors + categoryErrors + mitiErrors + amountErrors + duplicateWarnings + amountWarnings + autoCreateWarnings > 0,
    };
  }, [preview]);

  if (loading) return <LoadingState message="Loading import data..." />;
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
          Upload an Excel or CSV file with your expense data
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground" htmlFor="file-upload">
                Excel or CSV File (.xlsx, .xls, .csv)
              </label>
              <input
                id="file-upload"
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="mt-2 block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate} type="button" className="w-full sm:w-auto">
              Download Template
            </Button>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoCreate}
              onChange={(e) => setAutoCreate(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-foreground">
              Auto-create missing parties, categories, and locations
            </span>
          </label>

          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={!hasFile}
          >
            {uploading ? "Uploading..." : "Upload & Preview"}
          </Button>
        </div>
      </div>

      {error && <Alert kind="danger">{error}</Alert>}

      {result && (
        <Alert kind="success">
          Successfully imported {result.importedCount} expense(s)
        </Alert>
      )}

      {preview && (
        <div className="flex flex-col gap-4">
          {/* Upload warnings (e.g., multi-sheet) */}
          {uploadWarnings.length > 0 && (
            <Alert kind="warning">
              <p className="font-medium">Upload Warnings</p>
              <ul className="mt-1 list-disc">
                {uploadWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </Alert>
          )}

          {/* Summary card */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Preview: {preview.filename}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <span className="text-success">
                    {preview.rowCount - preview.errorCount - (preview.warningCount || 0)} valid
                  </span>
                  {(preview.warningCount || 0) > 0 && (
                    <span className="text-warning">
                      {preview.warningCount} warning{preview.warningCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {preview.errorCount > 0 && (
                    <span className="text-danger">
                      {preview.errorCount} error{preview.errorCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-muted">of {preview.rowCount} rows</span>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={confirming}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  loading={confirming}
                  disabled={preview.errorCount === preview.rowCount}
                  className="w-full sm:w-auto"
                >
                  {confirming ? "Confirming..." : `Confirm Import (${preview.rowCount - preview.errorCount} valid)`}
                </Button>
              </div>
            </div>

            {/* Issue breakdown */}
            {issueBreakdown?.hasIssues && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">Issues breakdown:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {issueBreakdown.partyErrors > 0 && (
                    <li className="text-danger">{issueBreakdown.partyErrors} {issueBreakdown.partyErrors === 1 ? "party" : "parties"} not found</li>
                  )}
                  {issueBreakdown.categoryErrors > 0 && (
                    <li className="text-danger">{issueBreakdown.categoryErrors} {issueBreakdown.categoryErrors === 1 ? "category" : "categories"} not found</li>
                  )}
                  {issueBreakdown.mitiErrors > 0 && (
                    <li className="text-danger">{issueBreakdown.mitiErrors} invalid date{issueBreakdown.mitiErrors !== 1 ? "s" : ""}</li>
                  )}
                  {issueBreakdown.amountErrors > 0 && (
                    <li className="text-danger">{issueBreakdown.amountErrors} amount error{issueBreakdown.amountErrors !== 1 ? "s" : ""}</li>
                  )}
                  {issueBreakdown.duplicateWarnings > 0 && (
                    <li className="text-warning">{issueBreakdown.duplicateWarnings} duplicate invoice number{issueBreakdown.duplicateWarnings !== 1 ? "s" : ""}</li>
                  )}
                  {issueBreakdown.amountWarnings > 0 && (
                    <li className="text-warning">{issueBreakdown.amountWarnings} amount mismatch{issueBreakdown.amountWarnings !== 1 ? "es" : ""}</li>
                  )}
                  {issueBreakdown.autoCreateWarnings > 0 && (
                    <li className="text-primary">{issueBreakdown.autoCreateWarnings} will be auto-created</li>
                  )}
                </ul>
              </div>
            )}

            {/* Auto-create summary */}
            {preview.created && (preview.created.parties + preview.created.categories + preview.created.locations) > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm text-muted">
                  Auto-create: {preview.created.parties} {preview.created.parties === 1 ? "party" : "parties"}, {preview.created.categories} {preview.created.categories === 1 ? "category" : "categories"}, {preview.created.locations} {preview.created.locations === 1 ? "location" : "locations"}
                </p>
              </div>
            )}
          </div>

          {/* Preview table */}
          <DataTable
            compact
            rowClassName={(row) => {
              if (row.status === "error") return "bg-danger/5";
              if (row.warnings.length > 0) return "bg-warning/5";
              return "";
            }}
            columns={[
              {
                header: "#",
                cell: (row) => <span className="text-muted">{row.rowIndex}</span>,
              },
              {
                header: "Status",
                cell: (row) => {
                  if (row.status === "error") return <Badge tone="danger">Error</Badge>;
                  if (row.warnings.length > 0) return <Badge tone="warning">Warning</Badge>;
                  return <Badge tone="success">Valid</Badge>;
                },
              },
              {
                header: "Miti",
                cell: (row) => {
                  const hasError = row.errors.some((e) => e.includes("miti"));
                  return (
                    <span className={hasError ? "rounded border border-danger px-1" : ""}>
                      {row.raw.miti}
                    </span>
                  );
                },
              },
              { header: "Invoice", cell: (row) => row.raw.invoiceNumber ?? "\u2014" },
              {
                header: "Party",
                cell: (row) => {
                  if (row.resolved.partyName) return <span>{row.resolved.partyName}</span>;
                  if (row.suggestions?.party) {
                    return (
                      <span className="text-warning">
                        {row.raw.partyName}
                        <span className="ml-1 text-xs">
                          {"\u2192"} Did you mean <strong>{row.suggestions.party}</strong>?
                        </span>
                      </span>
                    );
                  }
                  return <span className="text-danger">{row.raw.partyName}</span>;
                },
              },
              {
                header: "Category",
                cell: (row) => {
                  if (row.resolved.categoryName) return <span>{row.resolved.categoryName}</span>;
                  if (row.suggestions?.category) {
                    return (
                      <span className="text-warning">
                        {row.raw.categoryName}
                        <span className="ml-1 text-xs">
                          {"\u2192"} Did you mean <strong>{row.suggestions.category}</strong>?
                        </span>
                      </span>
                    );
                  }
                  return <span className="text-danger">{row.raw.categoryName}</span>;
                },
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
                header: "Issues",
                cell: (row) => {
                  const allIssues = [
                    ...row.errors.map((e) => ({ type: "error" as const, text: e })),
                    ...row.warnings.map((w) => ({ type: "warning" as const, text: w })),
                  ];
                  if (allIssues.length === 0) return null;
                  return (
                    <ul className="list-disc text-xs">
                      {allIssues.map((issue, i) => (
                        <li key={i} className={issue.type === "error" ? "text-danger" : "text-warning"}>
                          {issue.text}
                        </li>
                      ))}
                    </ul>
                  );
                },
              },
            ]}
            rows={preview.rows}
            getKey={(row) => row.id}
            mobileCard={(row) => (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {row.status === "error" ? (
                      <Badge tone="danger">Error</Badge>
                    ) : row.warnings.length > 0 ? (
                      <Badge tone="warning">Warning</Badge>
                    ) : (
                      <Badge tone="success">Valid</Badge>
                    )}
                    <span className="text-sm font-medium">{row.raw.item}</span>
                  </div>
                  <span className="tabular-amount font-medium">{formatAmount(row.raw.totalAmount)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {row.raw.miti} · {row.resolved.partyName ?? row.raw.partyName}
                </p>
                {row.errors.length > 0 && (
                  <ul className="mt-1 list-disc text-xs text-danger">
                    {row.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                {row.warnings.length > 0 && (
                  <ul className="mt-1 list-disc text-xs text-warning">
                    {row.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                )}
              </>
            )}
          />
        </div>
      )}

      <ConfirmDialog
        open={showConfirmDialog}
        title="Confirm Import"
        message={`This will create ${preview ? preview.rowCount - preview.errorCount : 0} expense(s). This cannot be easily undone.`}
        confirmLabel="Import"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}
