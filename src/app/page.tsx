"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, apiUrl } from "@/lib/api-client";
import { useApp } from "@/lib/use-app";
import { formatAmount, nepaliGroupedNumber } from "@/lib/format";

interface ExpenseSummary {
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  miti: string;
  item: string;
  invoiceNumber: string | null;
  partyName: string;
}

interface Shortcut {
  href: string;
  label: string;
  hint: string;
}

const SHORTCUTS: Shortcut[] = [
  { href: "/expenses/new", label: "Record an expense", hint: "Enter a purchase invoice" },
  { href: "/expenses", label: "Browse expenses", hint: "Search, filter and paginate" },
  { href: "/reports/monthly", label: "Monthly report", hint: "Category breakdown by month" },
  { href: "/reports/fiscal-year", label: "FY report", hint: "12-month overview" },
  { href: "/parties", label: "Manage parties", hint: "Suppliers and their VAT numbers" },
  { href: "/fiscal-years", label: "Fiscal years", hint: "2082/83 and beyond" },
];

/**
 * Displays the VAT expense dashboard for the selected company and fiscal year.
 */
export default function DashboardPage() {
  const { companyId, fiscalYearId, activeFiscalYear, companies, loading } = useApp();
  const [summary, setSummary] = useState<ExpenseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const company = companies.find((c) => c.id === companyId);

  useEffect(() => {
    if (!companyId || !fiscalYearId) return;
    api<{ data: ExpenseSummary[] }>(
      apiUrl("/api/expenses", { companyId, fiscalYearId, pageSize: 200 }),
    )
      .then(({ data }) => setSummary(data))
      .catch((e: ApiError) => setError(e.detail));
  }, [companyId, fiscalYearId]);

  const totals = summary.reduce(
    (acc, e) => ({
      taxable: acc.taxable + (Number(e.taxableAmount) || 0),
      vat: acc.vat + (Number(e.vatAmount) || 0),
      total: acc.total + (Number(e.totalAmount) || 0),
    }),
    { taxable: 0, vat: 0, total: 0 },
  );

  const recent = summary.slice(0, 5);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-baseline justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
              <div className="mt-2 h-7 w-28 animate-pulse rounded bg-surface-muted" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4">
              <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
              <div className="mt-2 h-3 w-36 animate-pulse rounded bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!companyId) {
    return (
      <p className="text-sm text-muted">
        No company configured yet — create one via the API or the parties page flow.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {company?.name ?? "VAT Expense Ledger"}
        </h1>
        <span className="text-sm text-muted">
          {activeFiscalYear ? `FY ${activeFiscalYear.name}` : "No fiscal year"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Taxable</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold">
            {formatAmount(totals.taxable)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">VAT input credit</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold">{formatAmount(totals.vat)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Total purchases</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold text-primary">
            {formatAmount(totals.total)}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted">
        {summary.length} expense{summary.length === 1 ? "" : "s"} this fiscal year (
        {nepaliGroupedNumber(totals.total)}).
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-subtle"
          >
            <p className="font-medium text-primary group-hover:underline">{s.label}</p>
            <p className="mt-1 text-sm text-muted">{s.hint}</p>
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Recent expenses</h2>
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted">No expenses recorded yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">Miti</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">{e.miti}</td>
                      <td className="px-4 py-3">{e.invoiceNumber ?? "—"}</td>
                      <td className="px-4 py-3">{e.partyName}</td>
                      <td className="px-4 py-3">{e.item}</td>
                      <td className="tabular-amount px-4 py-3 text-right font-medium">
                        {formatAmount(e.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="rounded-lg border border-border bg-surface sm:hidden">
              {recent.map((e, i) => (
                <div key={i} className="border-b border-border p-4 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{e.partyName}</span>
                    <span className="tabular-amount font-medium">{formatAmount(e.totalAmount)}</span>
                  </div>
                  <p className="truncate text-sm text-muted">{e.item}</p>
                  <p className="mt-1 text-xs text-muted">{e.miti}{e.invoiceNumber ? ` · Inv: ${e.invoiceNumber}` : ""}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}