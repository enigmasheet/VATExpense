import { redirect } from "next/navigation";
import { getCompanyId, getActiveFiscalYear, getMonthlyReport } from "@/lib/server-data";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { formatAmount } from "@/lib/format";
import { MonthlyReportExport } from "@/components/monthly-report-export";
import { MonthSelector } from "@/components/month-selector";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

/**
 * Displays the monthly expense report for the requested Nepali month.
 *
 * @param searchParams - URL parameters containing the selected Nepali month.
 * @returns The monthly report page, or a fiscal-year setup message when no active fiscal year exists.
 */
export default async function MonthlyReportPage({ searchParams }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) redirect("/login");

  const params = await searchParams;
  const nepaliMonth = (params.month || "Baisakh") as (typeof NEPALI_MONTHS)[number];

  const activeFiscalYear = await getActiveFiscalYear(companyId);
  if (!activeFiscalYear) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Monthly Report</h1>
        <p className="text-sm text-muted">No fiscal year configured — create one first.</p>
      </div>
    );
  }

  const report = await getMonthlyReport(companyId, activeFiscalYear.id, nepaliMonth);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Monthly Report</h1>
          <p className="mt-1 text-sm text-muted">
            Category breakdown for {nepaliMonth} · FY {activeFiscalYear.name}
          </p>
        </div>
        <MonthlyReportExport
          companyId={companyId}
          fiscalYearId={activeFiscalYear.id}
          nepaliMonth={nepaliMonth}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <p className="text-sm text-muted">
        {report.totals.expenseCount} expense{report.totals.expenseCount === 1 ? "" : "s"} in{" "}
        {nepaliMonth}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">By Category</h2>
        {report.categories.length === 0 ? (
          <p className="text-sm text-muted">No expenses for this month.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Expenses</th>
                  <th className="px-4 py-3 text-right">Taxable</th>
                  <th className="px-4 py-3 text-right">VAT</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((cat) => (
                  <tr key={cat.categoryId} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 font-medium">{cat.categoryName}</td>
                    <td className="tabular-amount px-4 py-3 text-right">{cat.expenseCount}</td>
                    <td className="tabular-amount px-4 py-3 text-right">
                      {formatAmount(cat.totalTaxableAmount)}
                    </td>
                    <td className="tabular-amount px-4 py-3 text-right">
                      {formatAmount(cat.totalVatAmount)}
                    </td>
                    <td className="tabular-amount px-4 py-3 text-right font-medium">
                      {formatAmount(cat.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Month selector - client-side navigation */}
      <MonthSelector currentMonth={nepaliMonth} />
    </div>
  );
}
