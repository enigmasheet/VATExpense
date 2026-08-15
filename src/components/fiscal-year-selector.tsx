"use client";

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
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-foreground" htmlFor="fy-nav">
        Fiscal year
      </label>
      <form action="/reports/parties" method="get">
        <input type="hidden" name="basis" value={basis} />
        <select
          id="fy-nav"
          name="fiscalYearId"
          value={currentFiscalYearId}
          onChange={(e) => e.target.form?.requestSubmit()}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {fiscalYears.map((fy) => (
            <option key={fy.id} value={fy.id}>
              {fy.name}
            </option>
          ))}
        </select>
      </form>
    </div>
  );
}
