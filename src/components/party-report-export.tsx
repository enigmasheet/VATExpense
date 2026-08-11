"use client";

import { Button } from "@/components/ui/button";

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
  function handleExport() {
    const params = new URLSearchParams({ companyId, fiscalYearId, basis });
    window.open(`/api/export/parties?${params.toString()}`, "_blank");
  }

  return (
    <Button variant="secondary" onClick={handleExport}>
      Export .xlsx
    </Button>
  );
}
