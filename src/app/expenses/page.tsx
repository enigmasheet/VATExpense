"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, apiUrl } from "@/lib/api-client";
import { useApp } from "@/lib/use-app";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

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

export default function ExpensesPage() {
  const { companyId, fiscalYearId, activeFiscalYear } = useApp();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [partyId, setPartyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [month, setMonth] = useState("");

  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!companyId) return;
    api<{ data: { id: string; name: string }[] }>(`/api/parties?companyId=${companyId}`).then(
      ({ data }) => setParties(data),
    );
    api<{ data: { id: string; name: string }[] }>(`/api/categories?companyId=${companyId}`).then(
      ({ data }) => setCategories(data),
    );
  }, [companyId]);

  const refresh = useCallback(() => {
    if (!companyId || !fiscalYearId) return;
    setLoading(true);
    setError(null);
    api<ListResponse>(
      apiUrl("/api/expenses", {
        companyId,
        fiscalYearId,
        page,
        pageSize,
        q,
        partyId,
        categoryId,
        month,
      }),
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .catch((e: ApiError) => setError(e.detail))
      .finally(() => setLoading(false));
  }, [companyId, fiscalYearId, page, pageSize, q, partyId, categoryId, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function removeExpense(id: string, item: string) {
    if (!window.confirm(`Delete "${item}"? This can be undone from the database only.`)) return;
    try {
      await api(`/api/expenses/${id}`, { method: "DELETE" });
      refresh();
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
          setPage(1);
          refresh();
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
            onClick={() => {
              setQ("");
              setPartyId("");
              setCategoryId("");
              setMonth("");
              setPage(1);
              refresh();
            }}
          >
            Reset
          </Button>
        </div>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No expenses match. Record your first one.
          </p>
        ) : (
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
                <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-[#f8f7f2]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/expenses/${row.id}`} className="font-medium text-primary hover:underline">
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
                      onClick={() => removeExpense(row.id, row.item)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}