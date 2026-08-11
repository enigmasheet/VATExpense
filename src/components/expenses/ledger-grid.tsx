"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { batchSaveExpenses, type BatchRowInput } from "@/lib/actions/expenses";
import { round2 } from "@/lib/money";
import { formatAmount } from "@/lib/format";
import { parseMiti } from "@/lib/nepali-date";
import { VAT_RATE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const VAT_FACTOR = 1 + VAT_RATE / 100;

interface Party {
  id: string;
  name: string;
  vatNumber: string | null;
  locationId: string | null;
  locationName: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface LedgerRow {
  id: string;
  miti: string;
  partyId: string;
  partyName: string;
  locationId: string | null;
  locationName: string | null;
  invoiceNumber: string;
  categoryId: string;
  categoryName: string;
  item: string;
  totalAmount: string;
  taxableAmount: string;
  vatAmount: string;
  status: "pending" | "saving" | "saved" | "error" | "duplicate" | "incomplete";
  error?: string;
  warnings?: string[];
}

type CellField = "miti" | "partySearch" | "invoiceNumber" | "categoryId" | "item" | "totalAmount";
const FIELD_ORDER: CellField[] = ["miti", "partySearch", "invoiceNumber", "categoryId", "item", "totalAmount"];

function calcFromTotal(total: number) {
  const taxable = round2(total / VAT_FACTOR);
  const vat = round2(total - taxable);
  return { taxable, vat };
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyRow(prev?: LedgerRow): LedgerRow {
  return {
    id: genId(),
    miti: prev?.miti ?? "",
    partyId: "",
    partyName: "",
    locationId: prev?.locationId ?? null,
    locationName: prev?.locationName ?? null,
    invoiceNumber: "",
    categoryId: prev?.categoryId ?? "",
    categoryName: prev?.categoryName ?? "",
    item: prev?.item ?? "",
    totalAmount: "",
    taxableAmount: "",
    vatAmount: "",
    status: "incomplete",
  };
}

function validateRow(row: LedgerRow, allRows: LedgerRow[], existingInvoices: Set<string>, fyName: string): string[] {
  const errors: string[] = [];
  if (!row.miti) {
    errors.push("Date required");
  } else {
    const parsed = parseMiti(row.miti);
    if (!parsed.ok) {
      errors.push("Invalid date");
    } else {
      const startMonth = 7;
      const fy = parsed.month >= startMonth ? parsed.year : parsed.year - 1;
      const rowFyName = `${fy}/${String((fy % 100) + 1).padStart(2, "0")}`;
      if (rowFyName !== fyName) {
        errors.push(`Date falls in FY ${rowFyName}`);
      }
    }
  }
  if (!row.partyId) errors.push("Party required");
  if (!row.categoryId) errors.push("Category required");
  if (!row.totalAmount || Number(row.totalAmount) <= 0) errors.push("Amount required");
  if (row.invoiceNumber && row.partyId) {
    const key = `${row.partyId}|${row.invoiceNumber}`;
    if (existingInvoices.has(key)) {
      errors.push("Duplicate: exists in ledger");
    }
    const dupesInBatch = allRows.filter(
      (r) => r.id !== row.id && r.partyId === row.partyId && r.invoiceNumber === row.invoiceNumber && r.invoiceNumber !== "",
    );
    if (dupesInBatch.length > 0) {
      errors.push("Duplicate in batch");
    }
  }
  return errors;
}

function getRowStatus(row: LedgerRow, allRows: LedgerRow[], existingInvoices: Set<string>, fyName: string): LedgerRow["status"] {
  if (!row.miti && !row.partyId && !row.totalAmount) return "incomplete";
  const errors = validateRow(row, allRows, existingInvoices, fyName);
  if (errors.length > 0) return "duplicate";
  return "pending";
}

interface PartyAutocompleteProps {
  allParties: Party[];
  value: string;
  partyId: string;
  onSelect: (party: Party) => void;
}

function PartyAutocomplete({ allParties, value, partyId, onSelect }: PartyAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Party[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef(value);

  if (prevValueRef.current !== value) {
    prevValueRef.current = value;
    setQuery(value);
  }

  const search = useCallback(
    (q: string) => {
      if (q.length < 1) { setResults([]); setOpen(false); return; }
      const lower = q.toLowerCase();
      const isVat = /\d{5,}/.test(q);
      let matched: Party[];
      if (isVat) {
        matched = allParties.filter((p) => p.vatNumber?.includes(q));
      } else {
        matched = allParties.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            (p.vatNumber && p.vatNumber.includes(q)),
        );
      }
      setResults(matched.slice(0, 8));
      setOpen(matched.length > 0);
      setHighlightIdx(-1);
    },
    [allParties],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && highlightIdx >= 0) { e.preventDefault(); e.stopPropagation(); selectParty(results[highlightIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  function selectParty(party: Party) {
    setQuery(party.name);
    setOpen(false);
    onSelect(party);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder="Search party or VAT..."
        className="h-8 w-full rounded border border-border bg-surface px-2 text-xs"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border border-border bg-surface shadow-lg">
          {results.map((party, idx) => (
            <button
              key={party.id}
              type="button"
              className={`block w-full px-3 py-2 text-left text-xs hover:bg-surface-hover ${
                idx === highlightIdx ? "bg-surface-hover" : ""
              } ${party.id === partyId ? "font-medium text-primary" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); selectParty(party); }}
            >
              <span className="font-medium">{party.name}</span>
              {party.vatNumber && <span className="ml-2 text-muted">VAT: {party.vatNumber}</span>}
              {party.locationName && <span className="ml-2 text-muted">· {party.locationName}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function statusBadge(status: LedgerRow["status"]) {
  switch (status) {
    case "pending": return <Badge tone="default">Ready</Badge>;
    case "saving": return <Badge tone="default">Saving...</Badge>;
    case "saved": return <Badge tone="success">Saved</Badge>;
    case "error": return <Badge tone="danger">Error</Badge>;
    case "duplicate": return <Badge tone="warning">Issue</Badge>;
    default: return <span className="text-xs text-muted">--</span>;
  }
}

interface LedgerGridProps {
  companyId: string;
  fiscalYearId: string;
  fiscalYearName: string;
  allParties: Party[];
  allCategories: Category[];
}

export function LedgerGrid({
  companyId,
  fiscalYearId,
  fiscalYearName,
  allParties,
  allCategories,
}: LedgerGridProps) {
  const [rows, setRows] = useState<LedgerRow[]>(() => [createEmptyRow()]);
  const [existingInvoices, setExistingInvoices] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ saved: number; errors: number } | null>(null);
  const [activeCell, setActiveCell] = useState<{ rowId: string; field: CellField } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId || !fiscalYearId) return;
    fetch(`/api/expenses?companyId=${companyId}&fiscalYearId=${fiscalYearId}&pageSize=500`)
      .then((r) => r.json())
      .then((res: { data: { partyId: string; invoiceNumber: string | null }[] }) => {
        const keys = new Set<string>();
        for (const e of res.data) {
          if (e.invoiceNumber) keys.add(`${e.partyId}|${e.invoiceNumber}`);
        }
        setExistingInvoices(keys);
      })
      .catch(() => {});
  }, [companyId, fiscalYearId]);

  const enrichedRows = useMemo(() => {
    return rows.map((row) => {
      const errors = validateRow(row, rows, existingInvoices, fiscalYearName);
      const status = getRowStatus(row, rows, existingInvoices, fiscalYearName);
      return { ...row, status, error: errors[0] };
    });
  }, [rows, existingInvoices, fiscalYearName]);

  const totals = useMemo(() => {
    const valid = enrichedRows.filter((r) => r.status === "pending" || r.status === "saving" || r.status === "saved");
    return valid.reduce(
      (acc, r) => ({
        taxable: acc.taxable + (Number(r.taxableAmount) || 0),
        vat: acc.vat + (Number(r.vatAmount) || 0),
        total: acc.total + (Number(r.totalAmount) || 0),
        count: acc.count + 1,
      }),
      { taxable: 0, vat: 0, total: 0, count: 0 },
    );
  }, [enrichedRows]);

  const pendingCount = enrichedRows.filter((r) => r.status === "pending").length;
  const duplicateCount = enrichedRows.filter((r) => r.status === "duplicate").length;

  function updateRow(rowId: string, updates: Partial<LedgerRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const next = { ...r, ...updates };
        if (updates.totalAmount !== undefined) {
          const total = Number(updates.totalAmount) || 0;
          if (total > 0) {
            const calc = calcFromTotal(total);
            next.taxableAmount = String(calc.taxable);
            next.vatAmount = String(calc.vat);
          } else {
            next.taxableAmount = "";
            next.vatAmount = "";
          }
        }
        return next;
      }),
    );
  }

  function addRow(afterId?: string) {
    setRows((prev) => {
      const idx = afterId ? prev.findIndex((r) => r.id === afterId) : prev.length - 1;
      const prevRow = idx >= 0 ? prev[idx] : undefined;
      const newRow = createEmptyRow(prevRow);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
  }

  function removeRow(rowId: string) {
    setRows((prev) => {
      if (prev.length <= 1) return [createEmptyRow()];
      return prev.filter((r) => r.id !== rowId);
    });
  }

  function duplicateRow(rowId: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx < 0) return prev;
      const src = prev[idx];
      const newRow: LedgerRow = { ...src, id: genId(), status: "pending", error: undefined, warnings: undefined };
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
  }

  function focusField(rowId: string, field: CellField) {
    setActiveCell({ rowId, field });
    setTimeout(() => {
      const el = gridRef.current?.querySelector<HTMLInputElement>(
        `[data-row="${rowId}"][data-field="${field}"]`,
      );
      el?.focus();
      el?.select();
    }, 0);
  }

  function handleCellKeyDown(e: React.KeyboardEvent, rowId: string, field: CellField) {
    const fieldIdx = FIELD_ORDER.indexOf(field);

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (fieldIdx < FIELD_ORDER.length - 1) {
        focusField(rowId, FIELD_ORDER[fieldIdx + 1]);
      } else {
        addRow(rowId);
        const rowIdx = rows.findIndex((r) => r.id === rowId);
        const nextRowId = rows[rowIdx + 1]?.id;
        if (nextRowId) setTimeout(() => focusField(nextRowId, "miti"), 10);
      }
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      removeRow(rowId);
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (fieldIdx < FIELD_ORDER.length - 1) {
        focusField(rowId, FIELD_ORDER[fieldIdx + 1]);
      } else {
        const rowIdx = rows.findIndex((r) => r.id === rowId);
        if (rowIdx < rows.length - 1) focusField(rows[rowIdx + 1].id, "miti");
      }
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (fieldIdx > 0) {
        focusField(rowId, FIELD_ORDER[fieldIdx - 1]);
      } else {
        const rowIdx = rows.findIndex((r) => r.id === rowId);
        if (rowIdx > 0) focusField(rows[rowIdx - 1].id, "totalAmount");
      }
    } else if (e.key === "Escape") {
      setActiveCell(null);
      (e.target as HTMLElement).blur();
    }
  }

  function handleGridKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); saveAll(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); if (activeCell) duplicateRow(activeCell.rowId); }
  }

  async function saveAll() {
    const pending = enrichedRows.filter((r) => r.status === "pending");
    if (pending.length === 0) return;
    setSaving(true);
    setSaveResult(null);

    // Mark all as saving
    setRows((prev) =>
      prev.map((r) => (r.status === "pending" ? { ...r, status: "saving" as const } : r)),
    );

    const batchInputs: BatchRowInput[] = pending.map((row) => ({
      fiscalYearId,
      partyId: row.partyId,
      categoryId: row.categoryId,
      locationId: row.locationId,
      miti: row.miti,
      invoiceNumber: row.invoiceNumber || null,
      item: row.item || row.categoryName,
      taxableAmount: row.taxableAmount,
      vatAmount: row.vatAmount,
      totalAmount: row.totalAmount,
      vatRate: "13.00",
    }));

    const result = await batchSaveExpenses(batchInputs);

    if (result.ok) {
      let savedCount = 0;
      let errorCount = 0;
      for (const r of result.data) {
        const rowId = pending[r.index].id;
        if (r.ok) {
          savedCount++;
          setRows((prev) =>
            prev.map((row) =>
              row.id === rowId
                ? { ...row, status: "saved" as const, error: undefined, warnings: r.warnings }
                : row,
            ),
          );
        } else {
          errorCount++;
          setRows((prev) =>
            prev.map((row) =>
              row.id === rowId
                ? { ...row, status: "error" as const, error: r.error }
                : row,
            ),
          );
        }
      }
      setSaveResult({ saved: savedCount, errors: errorCount });
    } else {
      // Batch-level failure — mark all as error
      setRows((prev) =>
        prev.map((r) =>
          r.status === "saving"
            ? { ...r, status: "error" as const, error: result.error }
            : r,
        ),
      );
      setSaveResult({ saved: 0, errors: pending.length });
    }

    setSaving(false);
  }

  function cellBg(status: LedgerRow["status"]) {
    switch (status) {
      case "saved": return "bg-success/5";
      case "error": return "bg-danger/5";
      case "duplicate": return "bg-warning/5";
      default: return "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Ledger Entry</h1>
          <p className="text-sm text-muted">
            Tab / Enter to move between fields. Enter on last column adds a new row. Ctrl+Enter saves all.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {totals.count} row{totals.count === 1 ? "" : "s"}
            {pendingCount > 0 && <span className="ml-1 text-primary">{pendingCount} ready</span>}
            {duplicateCount > 0 && <span className="ml-1 text-warning">{duplicateCount} issue{duplicateCount === 1 ? "" : "s"}</span>}
          </span>
          <Button variant="ghost" size="sm" onClick={() => addRow()}>+ Add Row</Button>
        </div>
      </div>

      <div ref={gridRef} className="overflow-x-auto rounded-lg border border-border bg-surface" onKeyDown={handleGridKeyDown}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="w-10 px-2 py-2 text-center">#</th>
              <th className="w-32 px-2 py-2">Date</th>
              <th className="px-2 py-2">Party</th>
              <th className="w-28 px-2 py-2">Invoice</th>
              <th className="w-36 px-2 py-2">Category</th>
              <th className="px-2 py-2">Item</th>
              <th className="w-32 px-2 py-2 text-right">Amount</th>
              <th className="w-24 px-2 py-2 text-center">Status</th>
              <th className="w-16 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {enrichedRows.map((row, idx) => (
              <tr key={row.id} className={`border-b border-border last:border-b-0 ${cellBg(row.status)}`}>
                <td className="px-2 py-1 text-center text-xs text-muted">{idx + 1}</td>

                <td className="px-1 py-1">
                  <input
                    type="text"
                    data-row={row.id}
                    data-field="miti"
                    value={row.miti}
                    onChange={(e) => updateRow(row.id, { miti: e.target.value })}
                    onKeyDown={(e) => handleCellKeyDown(e, row.id, "miti")}
                    placeholder="2082-05-27"
                    className="h-8 w-full rounded border border-border bg-surface px-2 text-xs tabular-amount"
                  />
                </td>

                <td className="px-1 py-1">
                  <PartyAutocomplete
                    allParties={allParties}
                    value={row.partyName}
                    partyId={row.partyId}
                    onSelect={(party) => updateRow(row.id, {
                      partyId: party.id, partyName: party.name,
                      locationId: party.locationId, locationName: party.locationName,
                    })}
                  />
                </td>

                <td className="px-1 py-1">
                  <input
                    type="text"
                    data-row={row.id}
                    data-field="invoiceNumber"
                    value={row.invoiceNumber}
                    onChange={(e) => updateRow(row.id, { invoiceNumber: e.target.value })}
                    onKeyDown={(e) => handleCellKeyDown(e, row.id, "invoiceNumber")}
                    className="h-8 w-full rounded border border-border bg-surface px-2 text-xs"
                  />
                </td>

                <td className="px-1 py-1">
                  <select
                    data-row={row.id}
                    data-field="categoryId"
                    value={row.categoryId}
                    onChange={(e) => {
                      const cat = allCategories.find((c) => c.id === e.target.value);
                      updateRow(row.id, { categoryId: e.target.value, categoryName: cat?.name ?? "" });
                    }}
                    onKeyDown={(e) => handleCellKeyDown(e, row.id, "categoryId")}
                    className="h-8 w-full rounded border border-border bg-surface px-2 text-xs"
                  >
                    <option value="">--</option>
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>

                <td className="px-1 py-1">
                  <input
                    type="text"
                    data-row={row.id}
                    data-field="item"
                    value={row.item}
                    onChange={(e) => updateRow(row.id, { item: e.target.value })}
                    onKeyDown={(e) => handleCellKeyDown(e, row.id, "item")}
                    placeholder={row.categoryName || "Description"}
                    className="h-8 w-full rounded border border-border bg-surface px-2 text-xs"
                  />
                </td>

                <td className="px-1 py-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    data-row={row.id}
                    data-field="totalAmount"
                    value={row.totalAmount}
                    onChange={(e) => updateRow(row.id, { totalAmount: e.target.value })}
                    onKeyDown={(e) => handleCellKeyDown(e, row.id, "totalAmount")}
                    placeholder="0.00"
                    className="h-8 w-full rounded border border-border bg-surface px-2 text-xs text-right tabular-amount"
                  />
                </td>

                <td className="px-2 py-1 text-center">
                  {statusBadge(row.status)}
                  {row.error && <p className="mt-0.5 max-w-40 truncate text-[10px] text-warning" title={row.error}>{row.error}</p>}
                </td>

                <td className="px-2 py-1 text-right">
                  <button
                    className="text-xs text-danger hover:underline"
                    onClick={() => removeRow(row.id)}
                    title="Remove row"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted">Taxable: </span>
            <span className="tabular-amount font-medium">{formatAmount(totals.taxable)}</span>
          </div>
          <div>
            <span className="text-muted">VAT: </span>
            <span className="tabular-amount font-medium">{formatAmount(totals.vat)}</span>
          </div>
          <div>
            <span className="text-muted">Total: </span>
            <span className="tabular-amount font-semibold text-primary">{formatAmount(totals.total)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveResult && (
            <span className="text-sm text-muted">
              {saveResult.saved} saved{saveResult.errors > 0 ? `, ${saveResult.errors} error(s)` : ""}
            </span>
          )}
          <Button onClick={saveAll} disabled={saving || pendingCount === 0}>
            {saving ? "Saving..." : `Save ${pendingCount} Invoice${pendingCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
