"use client";

import { Button } from "@/components/ui/button";

interface FiscalYearReportExportProps {
  companyId: string;
  fiscalYearId: string;
}

export function FiscalYearReportExport({
  companyId,
  fiscalYearId,
}: FiscalYearReportExportProps) {
  function handleExport() {
    const params = new URLSearchParams({ companyId, fiscalYearId });
    window.open(`/api/export/fiscal-year?${params.toString()}`, "_blank");
  }

  return (
    <Button variant="secondary" onClick={handleExport}>
      Export .xlsx
    </Button>
  );
}
