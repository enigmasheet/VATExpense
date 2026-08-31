"use client";

import { useState, useRef, useCallback } from "react";
import { useApp } from "@/lib/useApp";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/status-widgets";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { ImportPreviewTable } from "./import-preview-table";
import { ImportIssueSummary } from "./import-issue-summary";
import type { BatchPreview, ImportResult, UploadResponse } from "./types";

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
  const [applyingRowId, setApplyingRowId] = useState<string | null>(null);

  const handleFileChange = useCallback(() => {
    setHasFile(!!fileRef.current?.files?.[0]);
  }, []);

  const downloadTemplate = useCallback(() => {
    const headers = ["Sno", "Miti", "Invoice No", "Party", "Location", "Vat No", "Item", "Quantity", "Rate", "Taxable Amount", "VAT Amount", "Total Amount"];
    const sampleRow = ["1", "01/11/2082", "3217", "dinbandhu oil and trading house", "birgunj", "300035058", "diesel", "42.84", "120.8", "5175.07", "672.76", "5848"];
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

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !companyId || !fiscalYearId) return;

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
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleApplySuggestion = useCallback(
    async (rowId: string, field: "party" | "category", value: string) => {
      if (!preview) return;
      setApplyingRowId(rowId);
      try {
        const patchField = field === "party" ? "rawPartyName" : "rawCategoryName";
        await api(`/api/import/${preview.batchId}/rows/${rowId}`, {
          method: "PATCH",
          body: JSON.stringify({ [patchField]: value }),
        });
        const previewData = await api<{ data: BatchPreview }>(
          `/api/import/${preview.batchId}/preview?autoCreate=${autoCreate}`,
        );
        setPreview(previewData.data);
      } catch (e) {
        setError(e instanceof ApiError ? e.detail : "Failed to apply suggestion");
      } finally {
        setApplyingRowId(null);
      }
    },
    [preview, autoCreate],
  );

  if (loading) return <LoadingState message="Loading import data..." />;
  if (!companyId || !fiscalYearId) {
    return <p className="text-sm text-muted">Select a company and fiscal year to import expenses.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Import Expenses</h1>
        <p className="mt-1 text-sm text-muted">Upload an Excel or CSV file with your expense data</p>
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
            <input type="checkbox" checked={autoCreate} onChange={(e) => setAutoCreate(e.target.checked)} className="h-4 w-4 rounded border-border" />
            <span className="text-sm text-foreground">Auto-create missing parties, categories, and locations</span>
          </label>

          <Button onClick={handleUpload} loading={uploading} disabled={!hasFile}>
            {uploading ? "Uploading..." : "Upload & Preview"}
          </Button>
        </div>
      </div>

      {error && <Alert kind="danger">{error}</Alert>}

      {result && (
        <Alert kind="success">Successfully imported {result.importedCount} expense(s)</Alert>
      )}

      {preview && (
        <div className="flex flex-col gap-4">
          {uploadWarnings.length > 0 && (
            <Alert kind="warning">
              <p className="font-medium">Upload Warnings</p>
              <ul className="mt-1 list-disc">
                {uploadWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </Alert>
          )}

          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Preview: {preview.filename}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <span className="text-success">{preview.rowCount - preview.errorCount - (preview.warningCount || 0)} valid</span>
                  {(preview.warningCount || 0) > 0 && (
                    <span className="text-warning">{preview.warningCount} warning{preview.warningCount !== 1 ? "s" : ""}</span>
                  )}
                  {preview.errorCount > 0 && (
                    <span className="text-danger">{preview.errorCount} error{preview.errorCount !== 1 ? "s" : ""}</span>
                  )}
                  <span className="text-muted">of {preview.rowCount} rows</span>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button variant="ghost" onClick={handleCancel} disabled={confirming} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={() => setShowConfirmDialog(true)} loading={confirming} disabled={preview.errorCount === preview.rowCount} className="w-full sm:w-auto">
                  {confirming ? "Confirming..." : `Confirm Import (${preview.rowCount - preview.errorCount} valid)`}
                </Button>
              </div>
            </div>

            <ImportIssueSummary preview={preview} />

            {preview.created && (preview.created.parties + preview.created.categories + preview.created.locations) > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm text-muted">
                  Auto-create: {preview.created.parties} {preview.created.parties === 1 ? "party" : "parties"}, {preview.created.categories} {preview.created.categories === 1 ? "category" : "categories"}, {preview.created.locations} {preview.created.locations === 1 ? "location" : "locations"}
                </p>
              </div>
            )}

            {preview.rows.some((r) => r.resolved.fiscalYearName && r.resolved.fiscalYearName !== preview.fiscalYearName) && (
              <Alert kind="warning" className="mt-3">
                <p className="font-medium">Fiscal Year Mismatch</p>
                <p className="mt-1 text-sm">
                  Some rows have miti dates that fall in a different fiscal year ({preview.fiscalYearName}).
                  These rows will be filed under their correct FY automatically.
                </p>
              </Alert>
            )}
          </div>

          <ImportPreviewTable rows={preview.rows} batchFiscalYearName={preview.fiscalYearName} applyingRowId={applyingRowId} onApplySuggestion={handleApplySuggestion} />
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
