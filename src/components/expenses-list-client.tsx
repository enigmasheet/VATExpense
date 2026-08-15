"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { formatAmount } from "@/lib/format";
import { deleteExpense } from "@/lib/actions/expenses";
import { PATH_EXPENSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";

interface ExpenseRow {
  id: string;
  miti: string;
  nepaliMonth: string;
  invoiceNumber: string | null;
  item: string;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  rowVersion: number;
  partyId: string;
  partyName: string;
  categoryName: string;
}

interface ExpensesListClientProps {
  initialData: ExpenseRow[];
  initialPage: number;
  initialTotal: number;
  pageSize: number;
  fiscalYearName: string;
  parties: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

/**
 * Displays a filterable, paginated list of expenses with responsive layouts and deletion controls.
 *
 * @param initialData - The expenses shown on the initial page
 * @param initialPage - The current page number
 * @param initialTotal - The total number of matching expenses
 * @param pageSize - The number of expenses displayed per page
 * @param fiscalYearName - The fiscal year associated with the expenses
 * @param parties - Parties available for filtering
 * @param categories - Categories available for filtering
 */
export function ExpensesListClient({
  initialData,
  initialPage,
  initialTotal,
  pageSize,
  fiscalYearName,
  parties,
  categories,
}: ExpensesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [rows, setRows] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [partyId, setPartyId] = useState(searchParams.get("partyId") ?? "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") ?? "");
  const [month, setMonth] = useState(searchParams.get("month") ?? "");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; item: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildUrl = useCallback(
    (overrides: Record<string, string | number>) => {
      const params = new URLSearchParams();
      if (overrides.page && overrides.page !== 1) params.set("page", String(overrides.page));
      if (overrides.q) params.set("q", String(overrides.q));
      if (overrides.partyId) params.set("partyId", String(overrides.partyId));
      if (overrides.categoryId) params.set("categoryId", String(overrides.categoryId));
      if (overrides.month) params.set("month", String(overrides.month));
      return `${PATH_EXPENSES}${params.toString() ? `?${params.toString()}` : ""}`;
    },
    [],
  );

  function applyFilters() {
    router.push(buildUrl({ page: 1, q, partyId, categoryId, month }));
  }

  function resetFilters() {
    setQ("");
    setPartyId("");
    setCategoryId("");
    setMonth("");
    router.push(PATH_EXPENSES);
  }

  function goToPage(p: number) {
    router.push(buildUrl({ page: p, q, partyId, categoryId, month }));
  }

  async function confirmDeleteExpense() {
    if (!deleteTarget) return;
    const result = await deleteExpense(deleteTarget.id);
    if (result.ok) {
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      toast("Expense deleted.");
    } else {
      toast(result.error || "Failed to delete expense.", "error");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted">
            Fiscal year {fiscalYearName} · {total} record{total === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/expenses/new">
          <Button>Add Expense</Button>
        </Link>
      </div>

      <form
        className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <Field label="Search" htmlFor="filter-q">
          <Input
            id="filter-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Item, invoice, remarks"
          />
        </Field>
        <Field label="Party" htmlFor="filter-party">
          <Select id="filter-party" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">All parties</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="filter-category">
          <Select id="filter-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Month" htmlFor="filter-month">
          <Select id="filter-month" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {NEPALI_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-border bg-surface">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-muted">No expenses match. Record your first one.</p>
            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add Expense
            </Link>
          </div>
        ) : (
          <DataTable
            rowClassName={() => "hover:bg-surface-subtle"}
            columns={[
              {
                header: "Miti",
                cell: (row) => (
                  <span className="whitespace-nowrap">
                    <Link
                      href={`/expenses/${row.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.miti}
                    </Link>
                  </span>
                ),
              },
              {
                header: "Invoice",
                cell: (row) =>
                  row.invoiceNumber ? (
                    <span className="tabular-amount whitespace-nowrap">{row.invoiceNumber}</span>
                  ) : (
                    <Badge tone="warning">No invoice</Badge>
                  ),
              },
              { header: "Party", cell: (row) => row.partyName },
              {
                header: "Item",
                cell: (row) => (
                  <span className="block max-w-[16rem] truncate">
                    {row.item}
                    <span className="ml-2 text-xs text-muted">{row.categoryName}</span>
                  </span>
                ),
              },
              {
                header: "Taxable",
                align: "right",
                cell: (row) => <span className="tabular-amount">{formatAmount(row.taxableAmount)}</span>,
              },
              {
                header: "VAT",
                align: "right",
                cell: (row) => <span className="tabular-amount">{formatAmount(row.vatAmount)}</span>,
              },
              {
                header: "Total",
                align: "right",
                cell: (row) => (
                  <span className="tabular-amount font-medium">{formatAmount(row.totalAmount)}</span>
                ),
              },
              {
                header: "",
                align: "right",
                cell: (row) => (
                  <button
                    className="text-sm text-danger hover:underline"
                    onClick={() => setDeleteTarget({ id: row.id, item: row.item })}
                  >
                    Delete
                  </button>
                ),
              },
            ]}
            rows={rows}
            getKey={(row) => row.id}
            mobileCard={(row) => (
              <>
                <div className="mb-1 flex items-start justify-between">
                  <Link
                    href={`/expenses/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.miti}
                  </Link>
                  <span className="tabular-amount font-medium">{formatAmount(row.totalAmount)}</span>
                </div>
                <p className="text-sm text-foreground">{row.partyName}</p>
                <p className="truncate text-sm text-muted">{row.item}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{row.categoryName}</span>
                  <button
                    className="text-danger hover:underline"
                    onClick={() => setDeleteTarget({ id: row.id, item: row.item })}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          />
        )}
      </div>

      <Pagination
        page={initialPage}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        basePath={PATH_EXPENSES}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.item}"?`}
        message="This will permanently delete this expense. This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteExpense}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
