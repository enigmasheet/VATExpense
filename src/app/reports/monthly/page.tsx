"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/use-app";
import { api, ApiError, apiUrl } from "@/lib/api-client";
import { formatAmount } from "@/lib/format";
import { NEPALI_MONTHS, type NepaliMonth } from "@/lib/nepali-date";

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  totalTaxableAmount: string;
  totalVatAmount: string;
  totalAmount: string;
  expenseCount: number;
}

interface MonthlyReport {
  nepaliMonth: string;
  fiscalYearId: string;
  companyId: string;
  categories: CategoryBreakdown[];
  totals: {
    totalTaxableAmount: string;
    totalVatAmount: string;
    totalAmount: string;
    expenseCount: number;
  };
}

export default function MonthlyReportPage() {
  const { companyId, fiscalYearId, loading } = useApp();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<NepaliMonth>("Baisakh");
  const [error, setError] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (!companyId || !fiscalYearId) return;
    setLoadingReport(true);
    setError(null);
    api<{ data: MonthlyReport }>(
      apiUrl("/api/reports/monthly", {
        companyId,
        fiscalYearId,
        nepaliMonth: selectedMonth,
      }),
    )
      .then(({ data }) => setReport(data))
      .catch((e: ApiError) => setError(e.detail))
      .finally(() => setLoadingReport(false));
  }, [companyId, fiscalYearId, selectedMonth]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!companyId || !fiscalYearId) {
    return (
      <p className="text-sm text-muted">
        Select a company and fiscal year to view reports.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Monthly Report
          </h1>
          <p className="mt-1 text-sm text-muted">
            Category breakdown for a specific month
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-foreground" htmlFor="month-select">
          Month
        </label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value as NepaliMonth)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {NEPALI_MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {loadingReport && <p className="text-sm text-muted">Loading report…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {report && !loadingReport && (
        <>
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
            {report.totals.expenseCount} expense
            {report.totals.expenseCount === 1 ? "" : "s"} in {selectedMonth}
          </p>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              By Category
            </h2>
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
        </>
      )}
    </div>
  );
}
