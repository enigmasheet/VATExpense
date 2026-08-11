"use client";

import { Button } from "@/components/ui/button";

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
