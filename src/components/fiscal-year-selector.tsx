"use client";

import { NavSelect } from "@/components/ui/nav-select";

/**
 * Provides a selector for navigating between a company's fiscal years.
 *
 * @param fiscalYears - The fiscal years available to select from
 * @param currentFiscalYearId - The fiscal year initially selected in the selector
 * @param basis - The current report amount basis, preserved across navigation
 * @returns A fiscal year navigation control
 */
export function FiscalYearSelector({
  fiscalYears,
  currentFiscalYearId,
  basis,
}: {
  fiscalYears: { id: string; name: string }[];
  currentFiscalYearId: string;
  basis: string;
}) {
  return (
    <NavSelect
      label="Fiscal year"
      selectId="fy-nav"
      value={currentFiscalYearId}
      options={fiscalYears.map((fy) => ({ value: fy.id, label: fy.name }))}
      selectName="fiscalYearId"
      action="/reports/parties"
      hiddenInputs={{ basis }}
    />
  );
}