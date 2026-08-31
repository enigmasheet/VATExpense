"use client";

import { formatAmount } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { BatchRow } from "./types";

interface ImportPreviewTableProps {
  rows: BatchRow[];
  applyingRowId: string | null;
  onApplySuggestion: (rowId: string, field: "party" | "category", value: string) => void;
}

export function ImportPreviewTable({ rows, applyingRowId, onApplySuggestion }: ImportPreviewTableProps) {
  return (
    <DataTable
      compact
      rowClassName={(row) => {
        if (row.status === "error") return "bg-danger/5";
        if (row.warnings.length > 0) return "bg-warning/5";
        return "";
      }}
      columns={[
        { header: "#", cell: (row) => <span className="text-muted">{row.rowIndex}</span> },
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
                    {"\u2192"} Did you mean{" "}
                    <button
                      type="button"
                      className="font-semibold underline decoration-dotted underline-offset-2 hover:text-primary disabled:opacity-50"
                      disabled={applyingRowId === row.id}
                      onClick={() => onApplySuggestion(row.id, "party", row.suggestions.party!)}
                    >
                      {row.suggestions.party}
                    </button>
                    ?
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
                    {"\u2192"} Did you mean{" "}
                    <button
                      type="button"
                      className="font-semibold underline decoration-dotted underline-offset-2 hover:text-primary disabled:opacity-50"
                      disabled={applyingRowId === row.id}
                      onClick={() => onApplySuggestion(row.id, "category", row.suggestions.category!)}
                    >
                      {row.suggestions.category}
                    </button>
                    ?
                  </span>
                </span>
              );
            }
            return <span className="text-danger">{row.raw.categoryName}</span>;
          },
        },
        { header: "Item", cell: (row) => row.raw.item },
        { header: "Taxable", align: "right", cell: (row) => <span className="tabular-amount">{formatAmount(row.raw.taxableAmount)}</span> },
        { header: "VAT", align: "right", cell: (row) => <span className="tabular-amount">{formatAmount(row.raw.vatAmount)}</span> },
        { header: "Total", align: "right", cell: (row) => <span className="tabular-amount">{formatAmount(row.raw.totalAmount)}</span> },
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
      rows={rows}
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
  );
}
