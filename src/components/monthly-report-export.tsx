"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface MonthlyReportExportProps {
  companyId: string;
  fiscalYearId: string;
  nepaliMonth: string;
}

export function MonthlyReportExport({
  companyId,
  fiscalYearId,
  nepaliMonth,
}: MonthlyReportExportProps) {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleExport(format: "standard" | "reimport") {
    const params = new URLSearchParams({
      companyId,
      fiscalYearId,
      nepaliMonth,
      format,
    });
    setExportingFormat(format);
    try {
      const res = await fetch(`/api/export/monthly?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(errorData.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vat-report-${nepaliMonth}.${format === "reimport" ? "csv" : "xlsx"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("Export downloaded successfully", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed", "error");
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={() => handleExport("standard")}
        disabled={exportingFormat !== null}
      >
        {exportingFormat === "standard" ? "Exporting…" : "Export .xlsx"}
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleExport("reimport")}
        disabled={exportingFormat !== null}
      >
        {exportingFormat === "reimport" ? "Exporting…" : "Export .csv"}
      </Button>
    </div>
  );
}
