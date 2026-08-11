"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { batchSaveExpenses, type BatchRowInput } from "@/lib/actions/expenses";
import { round2 } from "@/lib/money";
import { formatAmount } from "@/lib/format";
import { parseMiti } from "@/lib/nepali-date";
import { VAT_RATE } from "@/lib/constants";

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
  partyResolved: boolean;
  locationId: string | null;
  locationName: string | null;
  invoiceNumber: string;
  categoryId: string;
  categoryName: string;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  status: "pending" | "saving" | "saved" | "error" | "duplicate" | "incomplete";
  error?: string;
  warnings?: string[];
}

type CellField = "miti" | "partySearch" | "invoiceNumber" | "categoryId" | "taxableAmount" | "totalAmount";
const FIELD_ORDER: CellField[] = ["miti", "partySearch", "invoiceNumber", "categoryId", "taxableAmount", "totalAmount"];

function calcFromTaxable(taxable: number): { vat: number; total: number } {
  const vat = round2(taxable * VAT_RATE / 100);
  const total = round2(taxable + vat);
  return { vat, total };
}

function calcFromTotal(total: number): { taxable: number; vat: number } {
  const taxable = round2(total / VAT_FACTOR);
  const vat = round2(total - taxable);
  return { taxable, vat };
}

let nextId = 1;

function genId() {
  return `row-${nextId++}`;
}

function createEmptyRow(prev?: LedgerRow): LedgerRow {
  return {
    id: genId(),
    miti: prev?.miti ?? "",
    partyId: "",
    partyName: "",
    partyResolved: false,
    locationId: prev?.locationId ?? null,
    locationName: prev?.locationName ?? null,
    invoiceNumber: "",
    categoryId: prev?.categoryId ?? "",
    categoryName: prev?.categoryName ?? "",
    taxableAmount: "",
    vatAmount: "",
    totalAmount: "",
    status: "incomplete",
  };
}

function validateRow(row: LedgerRow, allRows: LedgerRow[], existingInvoices: Set<string>, fyName: string): string[] {
  const errors: string[] = [];
  if (!row.miti) {
    errors.push("Miti required");
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
  if (!row.partyResolved || !row.partyId) errors.push("Select a valid party");
  if (!row.invoiceNumber.trim()) errors.push("Invoice number required");
  if (!row.categoryId) errors.push("Category required");
  if (!row.taxableAmount || parseFloat(row.taxableAmount) <= 0) errors.push("Taxable amount must be greater than 0");
  if (row.invoiceNumber && row.partyId) {
    const key = `${row.partyId}|${row.invoiceNumber}`;
    if (existingInvoices.has(key)) {
      errors.push(`Invoice ${row.invoiceNumber} already exists for this party`);
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
  if (!row.miti && !row.partyId && !row.taxableAmount) return "incomplete";
  const errors = validateRow(row, allRows, existingInvoices, fyName);
  if (errors.length > 0) return "duplicate";
  return "pending";
}

function isComplete(row: LedgerRow): boolean {
  return !!(
    row.miti.trim() &&
    row.partyResolved &&
    row.partyId &&
    row.invoiceNumber.trim() &&
    row.categoryId &&
    row.taxableAmount &&
    parseFloat(row.taxableAmount) > 0
  );
}

function isIssueRow(row: LedgerRow): boolean {
  return row.status === "error" || row.status === "duplicate" || row.status === "incomplete";
}

interface PartyAutocompleteProps {
  allParties: Party[];
  value: string;
  partyId: string;
  partyResolved: boolean;
  onSelect: (party: Party) => void;
}

function PartyAutocomplete({ allParties, value, partyId, partyResolved, onSelect }: PartyAutocompleteProps) {
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
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search party..."
          className={`h-8 w-full rounded border bg-transparent px-2 pr-6 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
            !partyResolved && query ? "border-destructive/50" : "border-border/50"
          }`}
        />
        {partyResolved && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500">
            &#10003;
          </span>
        )}
      </div>
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
              {party.locationName && <span className="ml-2 text-muted">&middot; {party.locationName}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: LedgerRow["status"] }) {
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Saved
      </span>
    );
  }
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Saving...
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Error
      </span>
    );
  }
  if (status === "duplicate") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        Issue
      </span>
    );
  }
  if (status === "incomplete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Incomplete
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Pending
    </span>
  );
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
  const [statusMessage, setStatusMessage] = useState("");
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
        if (updates.taxableAmount !== undefined) {
          const taxable = Number(updates.taxableAmount) || 0;
          if (taxable > 0) {
            const calc = calcFromTaxable(taxable);
            next.vatAmount = String(calc.vat);
            next.totalAmount = String(calc.total);
          } else {
            next.vatAmount = "";
            next.totalAmount = "";
          }
        }
        if (updates.categoryId !== undefined) {
          const cat = allCategories.find((c) => c.id === updates.categoryId);
          next.categoryName = cat?.name ?? "";
        }
        return next;
      }),
    );
  }

  function updatePartyName(rowId: string, partyName: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const match = allParties.find(
          (p) => p.name.toLowerCase() === partyName.toLowerCase()
        );
        if (match) {
          return {
            ...r,
            partyId: match.id,
            partyName: match.name,
            partyResolved: true,
            locationId: match.locationId,
            locationName: match.locationName,
          };
        }
        return {
          ...r,
          partyId: "",
          partyName,
          partyResolved: false,
          locationId: null,
          locationName: null,
        };
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
      const newRow: LedgerRow = {
        ...createEmptyRow(src),
        partyId: src.partyId,
        partyName: src.partyName,
        partyResolved: src.partyResolved,
        locationId: src.locationId,
        locationName: src.locationName,
        invoiceNumber: "",
        categoryId: src.categoryId,
        categoryName: src.categoryName,
        taxableAmount: src.taxableAmount,
        vatAmount: src.vatAmount,
        totalAmount: src.totalAmount,
        status: "pending",
        error: undefined,
        warnings: undefined,
      };
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
      if (e.ctrlKey) {
        saveAll();
      } else if (fieldIdx < FIELD_ORDER.length - 1) {
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
    } else if (e.key === "F2") {
      e.preventDefault();
      duplicateRow(rowId);
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
    setStatusMessage(`Saving ${pending.length} row${pending.length > 1 ? "s" : ""}...`);

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
      item: row.categoryName,
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
      setStatusMessage(`Saved ${savedCount} expense${savedCount > 1 ? "s" : ""}.${errorCount > 0 ? ` ${errorCount} error(s).` : ""}`);
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.status === "saving"
            ? { ...r, status: "error" as const, error: result.error }
            : r,
        ),
      );
      setSaveResult({ saved: 0, errors: pending.length });
      setStatusMessage(`Failed to save: ${result.error}`);
    }

    setSaving(false);
  }

  function cellBg(status: LedgerRow["status"]) {
    switch (status) {
      case "saved": return "bg-emerald-500/5";
      case "error": return "bg-destructive/5";
      case "duplicate": return "bg-amber-500/5";
      default: return "";
    }
  }

  return (
    <div className="flex flex-col gap-3" ref={gridRef}>
      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {/* Keyboard hints */}
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">Tab</kbd>
          Next field
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
          Next field or row
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+Enter</kbd>
          Save all
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">F2</kbd>
          Duplicate row
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
          Delete row
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-10 px-2 py-2 text-center">#</th>
              <th className="w-[100px] px-2 py-2">Miti</th>
              <th className="px-2 py-2">Party</th>
              <th className="w-[120px] px-2 py-2">Invoice</th>
              <th className="w-[140px] px-2 py-2">Category</th>
              <th className="w-[110px] px-2 py-2 text-right">Excl. VAT</th>
              <th className="w-[90px] px-2 py-2 text-right">VAT ({VAT_RATE}%)</th>
              <th className="w-[110px] px-2 py-2 text-right">Incl. VAT</th>
              <th className="w-20 px-2 py-2 text-center">Status</th>
              <th className="w-16 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {enrichedRows.map((row, idx) => (
              <React.Fragment key={row.id}>
                <tr className={`border-b border-border/30 last:border-b-0 ${cellBg(row.status)}`}>
                  <td className="px-2 py-1 text-center text-xs text-muted-foreground">{idx + 1}</td>

                  <td className="px-1 py-1">
                    <input
                      type="text"
                      data-row={row.id}
                      data-field="miti"
                      value={row.miti}
                      onChange={(e) => updateRow(row.id, { miti: e.target.value })}
                      onKeyDown={(e) => handleCellKeyDown(e, row.id, "miti")}
                      placeholder="2082-05-27"
                      className={`h-8 w-full rounded border bg-transparent px-2 text-xs tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        !row.miti.trim() && row.status !== "pending" ? "border-destructive/50" : "border-border/50"
                      }`}
                    />
                  </td>

                  <td className="px-1 py-1">
                    <PartyAutocomplete
                      allParties={allParties}
                      value={row.partyName}
                      partyId={row.partyId}
                      partyResolved={row.partyResolved}
                      onSelect={(party) => updateRow(row.id, {
                        partyId: party.id, partyName: party.name,
                        partyResolved: true,
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
                      placeholder="INV-001"
                      className={`h-8 w-full rounded border bg-transparent px-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        !row.invoiceNumber.trim() && row.status !== "pending" ? "border-destructive/50" : "border-border/50"
                      }`}
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
                      className={`h-8 w-full rounded border bg-transparent px-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        !row.categoryId ? "text-muted-foreground border-border/50" : "border-border/50"
                      }`}
                    >
                      <option value="">Select...</option>
                      {allCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-1 py-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      data-row={row.id}
                      data-field="taxableAmount"
                      value={row.taxableAmount}
                      onChange={(e) => updateRow(row.id, { taxableAmount: e.target.value })}
                      onKeyDown={(e) => handleCellKeyDown(e, row.id, "taxableAmount")}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`h-8 w-full rounded border bg-transparent px-2 text-right text-xs tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        (!row.taxableAmount || parseFloat(row.taxableAmount) <= 0) && row.status !== "pending"
                          ? "border-destructive/50"
                          : "border-border/50"
                      }`}
                    />
                  </td>

                  <td className="px-2 py-1.5 text-right text-xs text-muted-foreground tabular-amount">
                    {row.vatAmount ? formatAmount(parseFloat(row.vatAmount)) : "-"}
                  </td>

                  <td className="px-1 py-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      data-row={row.id}
                      data-field="totalAmount"
                      value={row.totalAmount}
                      onChange={(e) => updateRow(row.id, { totalAmount: e.target.value })}
                      onKeyDown={(e) => handleCellKeyDown(e, row.id, "totalAmount")}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`h-8 w-full rounded border bg-transparent px-2 text-right text-xs tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        (!row.totalAmount || parseFloat(row.totalAmount) <= 0) && row.status !== "pending"
                          ? "border-destructive/50"
                          : "border-border/50"
                      }`}
                    />
                  </td>

                  <td className="px-2 py-1 text-center">
                    <StatusBadge status={row.status} />
                  </td>

                  <td className="px-2 py-1 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateRow(row.id)}
                        title="Duplicate row (F2)"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        title="Delete row (Esc)"
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Inline error row */}
                {isIssueRow(row) && row.error && (
                  <tr className="border-b border-border/30 bg-destructive/5">
                    <td></td>
                    <td colSpan={9} className="px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>{row.error}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, status: "pending" as const, error: undefined }
                                  : r
                              )
                            );
                          }}
                          className="ml-2 text-xs font-medium text-primary hover:underline"
                        >
                          Fix
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Taxable (Excl. VAT)
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {formatAmount(totals.taxable)}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            VAT ({VAT_RATE}%)
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-muted-foreground">
            {formatAmount(totals.vat)}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total (Incl. VAT)
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {formatAmount(totals.total)}
          </div>
        </div>
      </div>

      {/* Row count */}
      <div className="text-xs text-muted-foreground">
        {enrichedRows.length} row{enrichedRows.length !== 1 ? "s" : ""} — {totals.count} ready to save
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => addRow()}
          className="inline-flex items-center gap-1.5 rounded border border-dashed border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add row
        </button>
        <button
          type="button"
          onClick={saveAll}
          disabled={saving || pendingCount === 0}
          className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {saving ? "Saving..." : `Save ${pendingCount} row${pendingCount === 1 ? "" : "s"}`}
          <kbd className="ml-2 rounded border border-primary-foreground/30 px-1.5 py-0.5 font-mono text-[10px]">
            Ctrl+Enter
          </kbd>
        </button>
        {saveResult && (
          <span className="text-sm text-muted-foreground">
            {saveResult.saved} saved{saveResult.errors > 0 ? `, ${saveResult.errors} error(s)` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
