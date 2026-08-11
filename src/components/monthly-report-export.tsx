"use client";

import { Button } from "@/components/ui/button";

interface MonthlyReportExportProps {
  companyId: string;
  fiscalYearId: string;
  nepaliMonth: string;
}

/**
 * Renders a button that opens the monthly report export.
 *
 * @param companyId - The company identifier included in the export request
 * @param fiscalYearId - The fiscal year identifier included in the export request
 * @param nepaliMonth - The Nepali month included in the export request
 * @returns A button for initiating the monthly report export
 */
export function MonthlyReportExport({
  companyId,
  fiscalYearId,
  nepaliMonth,
}: MonthlyReportExportProps) {
  function handleExport() {
    const params = new URLSearchParams({
      companyId,
      fiscalYearId,
      nepaliMonth,
    });
    window.open(`/api/export/monthly?${params.toString()}`, "_blank");
  }

  return (
    <Button variant="secondary" onClick={handleExport}>
      Export .xlsx
    </Button>
  );
}
