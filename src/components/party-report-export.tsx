"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface PartyReportExportProps {
  companyId: string;
  fiscalYearId: string;
  basis: string;
}

/**
 * Triggers the Excel download for the party purchase report.
 *
 * @param companyId - The identifier of the company
 * @param fiscalYearId - The identifier of the fiscal year
 * @param basis - The amount basis used for the report threshold
 */
export function PartyReportExport({ companyId, fiscalYearId, basis }: PartyReportExportProps) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    const params = new URLSearchParams({ companyId, fiscalYearId, basis });
    setDownloading(true);
    try {
      const res = await fetch(`/api/export/parties?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(errorData.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "party-report.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("Export downloaded successfully", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed", "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={handleExport} disabled={downloading}>
      {downloading ? "Exporting…" : "Export .xlsx"}
    </Button>
  );
}
