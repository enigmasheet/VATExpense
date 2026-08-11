"use client";

import { Button } from "@/components/ui/button";

interface FiscalYearReportExportProps {
  companyId: string;
  fiscalYearId: string;
}

/**
 * Renders a button that exports the specified fiscal year report as an Excel file.
 *
 * @param companyId - The company identifier included in the export request
 * @param fiscalYearId - The fiscal year identifier included in the export request
 */
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
