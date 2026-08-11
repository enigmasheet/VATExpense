import { redirect } from "next/navigation";
import { getCompanyId, getActiveFiscalYear, getFiscalYearReport } from "@/lib/server-data";
import { formatAmount } from "@/lib/format";
import { FiscalYearReportExport } from "@/components/fiscal-year-report-export";

/**
 * Displays the active fiscal year's report with summary totals and monthly expense details.
 *
 * Redirects unauthenticated users to the login page and prompts users to create a fiscal year when none is configured.
 *
 * @returns The rendered fiscal year report page.
 */
export default async function FiscalYearReportPage() {
  const companyId = await getCompanyId();
  if (!companyId) redirect("/login");

  const activeFiscalYear = await getActiveFiscalYear(companyId);
  if (!activeFiscalYear) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Fiscal Year Report</h1>
        <p className="text-sm text-muted">No fiscal year configured — create one first.</p>
      </div>
    );
  }

  const report = await getFiscalYearReport(companyId, activeFiscalYear.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Fiscal Year Report
          </h1>
          <p className="mt-1 text-sm text-muted">
            Monthly breakdown for FY {activeFiscalYear.name}
          </p>
        </div>
        <FiscalYearReportExport
          companyId={companyId}
          fiscalYearId={activeFiscalYear.id}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Total Expenses</p>
          <p className="mt-2 text-2xl font-semibold">{report.totals.expenseCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Taxable</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold">
            {formatAmount(report.totals.totalTaxableAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">VAT input credit</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold">
            {formatAmount(report.totals.totalVatAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Total purchases</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold text-primary">
            {formatAmount(report.totals.totalAmount)}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">By Month</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">VAT</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.months.map((month) => {
                const hasExpenses = month.expenseCount > 0;
                return (
                  <tr
                    key={month.nepaliMonth}
                    className={`border-b border-border last:border-b-0 ${
                      hasExpenses ? "" : "text-muted"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{month.nepaliMonth}</td>
                    <td className="tabular-amount px-4 py-3 text-right">{month.expenseCount}</td>
                    <td className="tabular-amount px-4 py-3 text-right">
                      {hasExpenses ? formatAmount(month.totalTaxableAmount) : "--"}
                    </td>
                    <td className="tabular-amount px-4 py-3 text-right">
                      {hasExpenses ? formatAmount(month.totalVatAmount) : "--"}
                    </td>
                    <td className="tabular-amount px-4 py-3 text-right font-medium">
                      {hasExpenses ? formatAmount(month.totalAmount) : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
