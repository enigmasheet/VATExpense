"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface FiscalYearReportExportProps {
  companyId: string;
  fiscalYearId: string;
}

export function FiscalYearReportExport({
  companyId,
  fiscalYearId,
}: FiscalYearReportExportProps) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  async function handleExport(detail: boolean) {
    const params = new URLSearchParams({ companyId, fiscalYearId });
    if (detail) params.set("detail", "true");
    setDownloading(true);
    try {
      const res = await fetch(`/api/export/fiscal-year?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(errorData.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fiscal-year-report${detail ? "-detail" : ""}.xlsx`;
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
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => handleExport(false)} disabled={downloading}>
        {downloading ? "Exporting…" : "Export Summary"}
      </Button>
      <Button variant="secondary" onClick={() => handleExport(true)} disabled={downloading}>
        {downloading ? "Exporting…" : "Export Detail"}
      </Button>
    </div>
  );
}
