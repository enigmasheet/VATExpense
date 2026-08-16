import { redirect } from "next/navigation";
import Link from "next/link";
import { getCompanyId, getActiveFiscalYear, getFiscalYearReport } from "@/lib/server-data";
import { formatAmount } from "@/lib/format";
import { FiscalYearReportExport } from "@/components/fiscal-year-report-export";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { PATH_LOGIN } from "@/lib/constants";

/**
 * Displays the active fiscal year's report with summary totals and monthly expense details.
 *
 * Redirects unauthenticated users to the login page and prompts users to create a fiscal year when none is configured.
 *
 * @returns The rendered fiscal year report page.
 */
export default async function FiscalYearReportPage() {
  const companyId = await getCompanyId();
  if (!companyId) redirect(PATH_LOGIN);

  const activeFiscalYear = await getActiveFiscalYear(companyId);
  if (!activeFiscalYear) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Fiscal Year Report" subtitle="No fiscal year configured — create one first." />
      </div>
    );
  }

  const report = await getFiscalYearReport(companyId, activeFiscalYear.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fiscal Year Report"
        subtitle={`Monthly breakdown for FY ${activeFiscalYear.name}`}
        actions={
          <FiscalYearReportExport
            companyId={companyId}
            fiscalYearId={activeFiscalYear.id}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Total Expenses" value={report.totals.expenseCount} />
        <StatCard label="Taxable" value={formatAmount(report.totals.totalTaxableAmount)} />
        <StatCard label="VAT input credit" value={formatAmount(report.totals.totalVatAmount)} />
        <StatCard label="Total purchases" value={formatAmount(report.totals.totalAmount)} accent />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">By Month</h2>
        <DataTable
          rowClassName={(month) => (month.expenseCount > 0 ? "hover:bg-surface-subtle cursor-pointer" : "text-muted")}
          columns={[
            {
              header: "Month",
              cell: (month) => (
                <Link
                  href={`/reports/monthly?month=${month.nepaliMonth}`}
                  className={month.expenseCount > 0 ? "font-medium text-primary hover:underline" : "font-medium"}
                >
                  {month.nepaliMonth}
                </Link>
              ),
            },
            {
              header: "Expenses",
              align: "right",
              cell: (month) => <span className="tabular-amount">{month.expenseCount}</span>,
            },
            {
              header: "Taxable",
              align: "right",
              cell: (month) => (
                <span className="tabular-amount">
                  {month.expenseCount > 0 ? formatAmount(month.totalTaxableAmount) : "--"}
                </span>
              ),
            },
            {
              header: "VAT",
              align: "right",
              cell: (month) => (
                <span className="tabular-amount">
                  {month.expenseCount > 0 ? formatAmount(month.totalVatAmount) : "--"}
                </span>
              ),
            },
            {
              header: "Total",
              align: "right",
              cell: (month) => (
                <span className="tabular-amount font-medium">
                  {month.expenseCount > 0 ? formatAmount(month.totalAmount) : "--"}
                </span>
              ),
            },
          ]}
          rows={report.months}
          getKey={(month) => month.nepaliMonth}
          mobileCard={(month) => {
            const hasExpenses = month.expenseCount > 0;
            return (
              <div className={hasExpenses ? "" : "text-muted"}>
                <div className="flex items-start justify-between">
                  <span className="font-medium">{month.nepaliMonth}</span>
                  {hasExpenses ? (
                    <span className="tabular-amount font-medium">{formatAmount(month.totalAmount)}</span>
                  ) : (
                    <span>--</span>
                  )}
                </div>
                {hasExpenses && (
                  <div className="mt-1 flex gap-4 text-xs text-muted">
                    <span>
                      {month.expenseCount} expense{month.expenseCount === 1 ? "" : "s"}
                    </span>
                    <span>Taxable {formatAmount(month.totalTaxableAmount)}</span>
                    <span>VAT {formatAmount(month.totalVatAmount)}</span>
                  </div>
                )}
              </div>
            );
          }}
        />
      </section>
    </div>
  );
}
