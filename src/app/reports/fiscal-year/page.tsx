"use client";

import { useEffect, useState, useRef } from "react";
import { useApp } from "@/lib/use-app";
import { api, ApiError, apiUrl } from "@/lib/api-client";
import { formatAmount } from "@/lib/format";

interface MonthBreakdown {
  nepaliMonth: string;
  totalTaxableAmount: string;
  totalVatAmount: string;
  totalAmount: string;
  expenseCount: number;
}

interface FiscalYearReport {
  fiscalYearId: string;
  companyId: string;
  months: MonthBreakdown[];
  totals: {
    totalTaxableAmount: string;
    totalVatAmount: string;
    totalAmount: string;
    expenseCount: number;
  };
}

/**
 * Displays expense and VAT summaries for the selected fiscal year, including monthly breakdowns and spreadsheet export.
 */
export default function FiscalYearReportPage() {
  const { companyId, fiscalYearId, activeFiscalYear, loading } = useApp();
  const [report, setReport] = useState<FiscalYearReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(0);

  useEffect(() => {
    if (!companyId || !fiscalYearId) return;
    const seq = ++inFlight.current;
    api<{ data: FiscalYearReport }>(
      apiUrl("/api/reports/fiscal-year", {
        companyId,
        fiscalYearId,
      }),
    )
      .then(({ data }) => {
        if (seq === inFlight.current) setReport(data);
      })
      .catch((e: ApiError) => {
        if (seq === inFlight.current) setError(e.detail);
      });
  }, [companyId, fiscalYearId]);

  const handleExport = () => {
    if (!companyId || !fiscalYearId) return;
    const url = apiUrl("/api/export/fiscal-year", {
      companyId,
      fiscalYearId,
    });
    window.open(url, "_blank");
  };

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
            Fiscal Year Report
          </h1>
          <p className="mt-1 text-sm text-muted">
            Monthly breakdown for FY {activeFiscalYear?.name ?? "—"}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#f8f7f2]"
        >
          Export .xlsx
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {report && (
        <>
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
            <h2 className="font-display text-lg font-semibold text-foreground">
              By Month
            </h2>
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
                        <td className="tabular-amount px-4 py-3 text-right">
                          {month.expenseCount}
                        </td>
                        <td className="tabular-amount px-4 py-3 text-right">
                          {hasExpenses ? formatAmount(month.totalTaxableAmount) : "–"}
                        </td>
                        <td className="tabular-amount px-4 py-3 text-right">
                          {hasExpenses ? formatAmount(month.totalVatAmount) : "–"}
                        </td>
                        <td className="tabular-amount px-4 py-3 text-right font-medium">
                          {hasExpenses ? formatAmount(month.totalAmount) : "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
