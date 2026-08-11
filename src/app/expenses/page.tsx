"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, apiUrl } from "@/lib/api-client";
import { useApp } from "@/lib/use-app";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface ExpenseRow {
  id: string;
  miti: string;
  nepaliMonth: string;
  invoiceNumber: string | null;
  item: string;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  partyName: string;
  categoryName: string;
  rowVersion: number;
}

interface ListResponse {
  data: ExpenseRow[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Displays paginated expenses for the active company and fiscal year, with search, filtering, navigation, and deletion controls.
 */
export default function ExpensesPage() {
  const { companyId, fiscalYearId, activeFiscalYear } = useApp();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [partyId, setPartyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [month, setMonth] = useState("");

  const debouncedQ = useDebounce(q, 300);

  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; item: string } | null>(null);

  useEffect(() => {
    if (!companyId) return;
    api<{ data: { id: string; name: string }[] }>(`/api/parties?companyId=${companyId}`).then(
      ({ data }) => setParties(data),
    );
    api<{ data: { id: string; name: string }[] }>(`/api/categories?companyId=${companyId}`).then(
      ({ data }) => setCategories(data),
    );
  }, [companyId]);

  const load = useCallback(async () => {
    if (!companyId || !fiscalYearId) return;
    try {
      const res = await api<ListResponse>(
        apiUrl("/api/expenses", {
          companyId,
          fiscalYearId,
          page,
          pageSize,
          q: debouncedQ,
          partyId,
          categoryId,
          month,
        }),
      );
      setRows(res.data);
      setTotal(res.total);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [companyId, fiscalYearId, page, pageSize, debouncedQ, partyId, categoryId, month]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function applyFilters(next: { q: string; partyId: string; categoryId: string; month: string }) {
    setQ(next.q);
    setPartyId(next.partyId);
    setCategoryId(next.categoryId);
    setMonth(next.month);
    setPage(1);
    setLoading(true);
  }

  async function confirmDeleteExpense() {
    if (!deleteTarget) return;
    try {
      await api(`/api/expenses/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      setLoading(true);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Failed to delete");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted">
            {activeFiscalYear ? `Fiscal year ${activeFiscalYear.name}` : "No fiscal year selected"} ·{" "}
            {total} record{total === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/expenses/new">
          <Button>New expense</Button>
        </Link>
      </div>

      <form
        className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters({ q, partyId, categoryId, month });
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
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              applyFilters({ q: "", partyId: "", categoryId: "", month: "" })
            }
          >
            Reset
          </Button>
        </div>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="rounded-lg border border-border bg-surface">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">No expenses match. Record your first one.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">Miti</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Taxable</th>
                    <th className="px-4 py-3 text-right">VAT</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-surface-subtle">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/expenses/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.miti}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.invoiceNumber ? (
                          <span className="tabular-amount">{row.invoiceNumber}</span>
                        ) : (
                          <Badge tone="warning">No invoice</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">{row.partyName}</td>
                      <td className="px-4 py-3 max-w-[16rem] truncate">
                        {row.item}
                        <span className="ml-2 text-xs text-muted">{row.categoryName}</span>
                      </td>
                      <td className="tabular-amount px-4 py-3 text-right">{formatAmount(row.taxableAmount)}</td>
                      <td className="tabular-amount px-4 py-3 text-right">{formatAmount(row.vatAmount)}</td>
                      <td className="tabular-amount px-4 py-3 text-right font-medium">
                        {formatAmount(row.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-sm text-danger hover:underline"
                          onClick={() => setDeleteTarget({ id: row.id, item: row.item })}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden">
              {rows.map((row) => (
                <div key={row.id} className="border-b border-border p-4 last:border-b-0">
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
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => p - 1);
              setLoading(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              setPage((p) => p + 1);
              setLoading(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Next
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.item}"?`}
        message="This action cannot be undone from the database only."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteExpense}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}