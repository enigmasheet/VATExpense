import { redirect } from "next/navigation";
import Link from "next/link";
import { getCompanyId, getActiveFiscalYear, getMonthlyReport } from "@/lib/server-data";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { formatAmount } from "@/lib/format";
import { MonthlyReportExport } from "@/components/monthly-report-export";
import { MonthSelector } from "@/components/month-selector";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { PATH_LOGIN } from "@/lib/constants";

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
  if (!companyId) redirect(PATH_LOGIN);

  const params = await searchParams;
  const nepaliMonth = (params.month || "Baisakh") as (typeof NEPALI_MONTHS)[number];

  const activeFiscalYear = await getActiveFiscalYear(companyId);
  if (!activeFiscalYear) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Monthly Report" subtitle="No fiscal year configured — create one first." />
      </div>
    );
  }

  const report = await getMonthlyReport(companyId, activeFiscalYear.id, nepaliMonth);

  const monthIndex = NEPALI_MONTHS.indexOf(nepaliMonth);
  const prevMonth = monthIndex > 0 ? NEPALI_MONTHS[monthIndex - 1] : null;
  const nextMonth = monthIndex < NEPALI_MONTHS.length - 1 ? NEPALI_MONTHS[monthIndex + 1] : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Monthly Report"
        subtitle={`Category breakdown for ${nepaliMonth} · FY ${activeFiscalYear.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {prevMonth && (
              <Link
                href={`/reports/monthly?month=${prevMonth}`}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-surface-hover"
              >
                ← {prevMonth}
              </Link>
            )}
            <MonthSelector currentMonth={nepaliMonth} />
            {nextMonth && (
              <Link
                href={`/reports/monthly?month=${nextMonth}`}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-surface-hover"
              >
                {nextMonth} →
              </Link>
            )}
            <MonthlyReportExport
              companyId={companyId}
              fiscalYearId={activeFiscalYear.id}
              nepaliMonth={nepaliMonth}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Taxable" value={formatAmount(report.totals.totalTaxableAmount)} />
        <StatCard label="VAT input credit" value={formatAmount(report.totals.totalVatAmount)} />
        <StatCard label="Total purchases" value={formatAmount(report.totals.totalAmount)} accent />
      </div>

      <p className="text-sm text-muted">
        {report.totals.expenseCount} expense{report.totals.expenseCount === 1 ? "" : "s"} in{" "}
        {nepaliMonth}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">By Category</h2>
        {report.categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-surface p-8 text-center">
            <p className="text-sm text-muted">No expenses for this month.</p>
          </div>
        ) : (
          <DataTable
            rowClassName={() => "hover:bg-surface-subtle cursor-pointer"}
            columns={[
              {
                header: "Category",
                cell: (cat) => (
                  <Link
                    href={`/expenses?categoryId=${cat.categoryId}&month=${nepaliMonth}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {cat.categoryName}
                  </Link>
                ),
              },
              {
                header: "Expenses",
                align: "right",
                cell: (cat) => <span className="tabular-amount">{cat.expenseCount}</span>,
              },
              {
                header: "Taxable",
                align: "right",
                cell: (cat) => (
                  <span className="tabular-amount">{formatAmount(cat.totalTaxableAmount)}</span>
                ),
              },
              {
                header: "VAT",
                align: "right",
                cell: (cat) => (
                  <span className="tabular-amount">{formatAmount(cat.totalVatAmount)}</span>
                ),
              },
              {
                header: "Total",
                align: "right",
                cell: (cat) => (
                  <span className="tabular-amount font-medium">{formatAmount(cat.totalAmount)}</span>
                ),
              },
            ]}
            rows={report.categories}
            getKey={(cat) => cat.categoryId ?? cat.categoryName ?? ""}
            mobileCard={(cat) => (
              <>
                <div className="flex items-start justify-between">
                  <span className="font-medium">{cat.categoryName}</span>
                  <span className="tabular-amount font-medium">{formatAmount(cat.totalAmount)}</span>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-muted">
                  <span>
                    {cat.expenseCount} expense{cat.expenseCount === 1 ? "" : "s"}
                  </span>
                  <span>Taxable {formatAmount(cat.totalTaxableAmount)}</span>
                  <span>VAT {formatAmount(cat.totalVatAmount)}</span>
                </div>
              </>
            )}
          />
        )}
      </section>
    </div>
  );
}
