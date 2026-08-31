"use client";

import { useMemo } from "react";
import type { BatchPreview } from "./types";

interface ImportIssueSummaryProps {
  preview: BatchPreview;
}

interface IssueBreakdown {
  partyErrors: number;
  categoryErrors: number;
  mitiErrors: number;
  amountErrors: number;
  duplicateWarnings: number;
  amountWarnings: number;
  autoCreateWarnings: number;
  hasIssues: boolean;
}

export function ImportIssueSummary({ preview }: ImportIssueSummaryProps) {
  const issueBreakdown = useMemo<IssueBreakdown | null>(() => {
    const rows = preview.rows;
    const partyErrors = rows.filter((r) => r.errors.some((e) => e.startsWith("Party"))).length;
    const categoryErrors = rows.filter((r) => r.errors.some((e) => e.startsWith("Category"))).length;
    const mitiErrors = rows.filter((r) => r.errors.some((e) => e.includes("miti"))).length;
    const amountErrors = rows.filter((r) => r.errors.some((e) => e.includes("amount") || e.includes("Amount"))).length;
    const duplicateWarnings = rows.filter((r) => r.warnings.some((w) => w.startsWith("Duplicate"))).length;
    const amountWarnings = rows.filter((r) => r.warnings.some((w) => w.includes("mismatch"))).length;
    const autoCreateWarnings = rows.filter((r) => r.warnings.some((w) => w.includes("will be created"))).length;

    return {
      partyErrors, categoryErrors, mitiErrors, amountErrors,
      duplicateWarnings, amountWarnings, autoCreateWarnings,
      hasIssues: partyErrors + categoryErrors + mitiErrors + amountErrors + duplicateWarnings + amountWarnings + autoCreateWarnings > 0,
    };
  }, [preview]);

  if (!issueBreakdown?.hasIssues) return null;

  return (
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
  );
}
