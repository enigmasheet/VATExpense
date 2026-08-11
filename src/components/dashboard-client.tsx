"use client";

import Link from "next/link";
import { formatAmount, nepaliGroupedNumber } from "@/lib/format";

interface RecentExpense {
  id: string;
  miti: string;
  invoiceNumber: string | null;
  item: string;
  totalAmount: string;
  partyName: string;
}

interface DashboardTotals {
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  expenseCount: number;
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

interface DashboardClientProps {
  companyName: string;
  fiscalYearName: string;
  totals: DashboardTotals;
  recent: RecentExpense[];
}

/**
 * Displays fiscal-year purchase totals, navigation shortcuts, and recent expenses for a company.
 *
 * @param props - Company, fiscal-year, summary, and recent-expense data displayed on the dashboard.
 */
export function DashboardClient({
  companyName,
  fiscalYearName,
  totals,
  recent,
}: DashboardClientProps) {
  const taxable = Number(totals.taxableAmount) || 0;
  const vat = Number(totals.vatAmount) || 0;
  const total = Number(totals.totalAmount) || 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">{companyName}</h1>
        <span className="text-sm text-muted">FY {fiscalYearName}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Taxable</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold">{formatAmount(taxable)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">VAT input credit</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold">{formatAmount(vat)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Total purchases</p>
          <p className="tabular-amount mt-2 text-2xl font-semibold text-primary">{formatAmount(total)}</p>
        </div>
      </div>

      <p className="text-sm text-muted">
        {totals.expenseCount} expense{totals.expenseCount === 1 ? "" : "s"} this fiscal year (
        {nepaliGroupedNumber(total)}).
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
        {recent.length === 0 ? (
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
                  {recent.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-surface-subtle">
                      <td className="px-4 py-3">
                        <Link href={`/expenses/${e.id}`} className="font-medium text-primary hover:underline">
                          {e.miti}
                        </Link>
                      </td>
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
              {recent.map((e) => (
                <div key={e.id} className="border-b border-border p-4 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <Link href={`/expenses/${e.id}`} className="font-medium text-primary hover:underline">
                      {e.partyName}
                    </Link>
                    <span className="tabular-amount font-medium">{formatAmount(e.totalAmount)}</span>
                  </div>
                  <p className="truncate text-sm text-muted">{e.item}</p>
                  <p className="mt-1 text-xs text-muted">
                    {e.miti}
                    {e.invoiceNumber ? ` · Inv: ${e.invoiceNumber}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
