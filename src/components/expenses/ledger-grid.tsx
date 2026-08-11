"use client";

import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLedgerSave } from "@/hooks/expenses/use-ledger-save";
import { formatAmount } from "@/lib/format";
import { VAT_RATE } from "@/lib/constants";
import { ledgerReducer } from "@/lib/expenses/ledger-reducer";
import { createLedgerRow, getInvoiceKey } from "@/lib/expenses/ledger-utils";
import { validateLedgerRow, buildDuplicateIndex } from "@/lib/expenses/ledger-validation";
import type { Party, Category, LedgerRow } from "@/lib/expenses/ledger-types";
import { FIELD_ORDER, type CellField } from "@/lib/expenses/ledger-types";
import { PartyAutocomplete } from "./party-autocomplete";
import { StatusBadge } from "./status-badge";
import { LedgerSummary } from "./ledger-summary";
import { LedgerActions } from "./ledger-actions";

/**
 * Determines whether a ledger row requires attention.
 *
 * @param row - The ledger row to evaluate
 * @returns `true` if the row has an error, duplicate, or incomplete status, `false` otherwise.
 */
function isIssueRow(row: LedgerRow): boolean {
  return row.status === "error" || row.status === "duplicate" || row.status === "incomplete";
}

interface LedgerGridProps {
  companyId: string;
  fiscalYearId: string;
  fiscalYearName: string;
  allParties: Party[];
  allCategories: Category[];
}

/**
 * Provides an editable expense ledger for a company and fiscal year, including validation, VAT calculations, row management, and batch saving.
 *
 * @param companyId - The company whose expenses are being entered
 * @param fiscalYearId - The fiscal year associated with the expenses
 * @param fiscalYearName - The fiscal year name used for date validation
 * @param allParties - Available parties for party selection
 * @param allCategories - Available expense categories
 */
export function LedgerGrid({
  companyId,
  fiscalYearId,
  fiscalYearName,
  allParties,
  allCategories,
}: LedgerGridProps) {
  const [rows, dispatch] = useReducer(ledgerReducer, [createLedgerRow()]);
  const [existingInvoices, setExistingInvoices] = useState<Set<string>>(new Set());
  const [existingInvoicesError, setExistingInvoicesError] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId || !fiscalYearId) return;

    let cancelled = false;
    const controller = new AbortController();

    fetch(
      `/api/expenses/invoice-keys?companyId=${companyId}&fiscalYearId=${fiscalYearId}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then(
        (res: {
          data: { partyId: string; invoiceNumber: string }[];
        }) => {
          if (cancelled) return;
          const keys = new Set<string>();
          for (const e of res.data) {
            keys.add(getInvoiceKey(e.partyId, e.invoiceNumber));
          }
          setExistingInvoices(keys);
          setExistingInvoicesError(false);
        },
      )
      .catch((err) => {
        if (cancelled || err.name === "AbortError") return;
        console.error("Failed to load existing invoices:", err);
        setExistingInvoicesError(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [companyId, fiscalYearId]);

  const duplicateIndex = useMemo(() => buildDuplicateIndex(rows), [rows]);

  const enrichedRows = useMemo(() => {
    return rows.map((row) => {
      if (row.status === "saving" || row.status === "saved" || row.status === "error") {
        return row;
      }
      const result = validateLedgerRow(row, duplicateIndex, existingInvoices, fiscalYearName);
      return { ...row, status: result.status, error: result.error, warnings: result.warnings };
    });
  }, [rows, duplicateIndex, existingInvoices, fiscalYearName]);

  const { saving, saveResult, statusMessage, saveAll } = useLedgerSave({
    enrichedRows,
    fiscalYearId,
    dispatch,
    setExistingInvoices,
  });

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
  const savedCount = enrichedRows.filter((r) => r.status === "saved").length;

  function updateField(rowId: string, field: string, value: string, categoryName?: string) {
    dispatch({ type: "UPDATE_FIELD", rowId, field, value, categoryName });
  }

  function selectParty(rowId: string, party: Party) {
    dispatch({
      type: "SELECT_PARTY",
      rowId,
      partyId: party.id,
      partyName: party.name,
      locationId: party.locationId,
      locationName: party.locationName,
    });
  }

  function searchParty(rowId: string, partyName: string) {
    const match = allParties.find((p) => p.name.toLowerCase() === partyName.toLowerCase());
    if (match) {
      dispatch({
        type: "UPDATE_PARTY_SEARCH",
        rowId,
        partyName: match.name,
        partyId: match.id,
        locationId: match.locationId,
        locationName: match.locationName,
      });
    } else {
      dispatch({ type: "UPDATE_PARTY_SEARCH", rowId, partyName });
    }
  }

  function addRow(afterId?: string): string {
    const idx = afterId ? rows.findIndex((r) => r.id === afterId) : rows.length - 1;
    const prevRow = idx >= 0 ? rows[idx] : undefined;
    const newRow = createLedgerRow(prevRow);
    dispatch({ type: "ADD_ROW", afterId, newRow });
    return newRow.id;
  }

  function duplicateRow(rowId: string) {
    const idx = rows.findIndex((r) => r.id === rowId);
    if (idx < 0) return;
    const src = rows[idx];
    const newRow: LedgerRow = {
      ...createLedgerRow(src),
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
    dispatch({ type: "DUPLICATE_ROW", newRow, sourceIdx: idx });
  }

  function focusField(rowId: string, field: CellField) {
    setTimeout(() => {
      const el = gridRef.current?.querySelector<HTMLElement>(
        `[data-row="${rowId}"][data-field="${field}"]`,
      );
      el?.focus();
      if (el instanceof HTMLInputElement) el.select();
    }, 0);
  }

  /**
   * Handles keyboard navigation and row actions for an editable ledger cell.
   *
   * @param e - The keyboard event from the cell
   * @param rowId - The identifier of the row containing the cell
   * @param field - The cell field receiving the event
   */
  function handleCellKeyDown(e: React.KeyboardEvent, rowId: string, field: CellField) {
    const fieldIdx = FIELD_ORDER.indexOf(field);

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.ctrlKey) {
        saveAll();
      } else if (fieldIdx < FIELD_ORDER.length - 1) {
        focusField(rowId, FIELD_ORDER[fieldIdx + 1]);
      } else {
        const newId = addRow(rowId);
        setTimeout(() => focusField(newId, "miti"), 10);
      }
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      dispatch({ type: "REMOVE_ROW", rowId });
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
      (e.target as HTMLElement).blur();
    }
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
      <div className="sr-only text-[11px] text-muted-foreground">
        Use Tab or Enter to move between fields, Ctrl+Enter to save all, F2 to duplicate a row, Esc to delete a row.
      </div>

      {/* Invoice index load error */}
      {existingInvoicesError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Unable to load existing invoices — duplicate detection may be incomplete. Please refresh to retry.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-10 px-3 py-3 text-center">#</th>
              <th className="w-25 px-3 py-3">Miti</th>
              <th className="px-3 py-3">Party</th>
              <th className="w-30 px-3 py-3">Invoice</th>
              <th className="w-35 px-3 py-3">Category</th>
              <th className="w-27.5 px-3 py-3 text-right">Excl. VAT</th>
              <th className="w-22.5 px-3 py-3 text-right">VAT ({VAT_RATE}%)</th>
              <th className="w-27.5 px-3 py-3 text-right">Incl. VAT</th>
              <th className="w-24 px-3 py-3 text-center">Status</th>
              <th className="w-20 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {enrichedRows.map((row, idx) => (
              <React.Fragment key={row.id}>
                <tr className={`border-b border-border/30 last:border-b-0 ${cellBg(row.status)}`}>
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>

                  <td className="px-1.5 py-1.5">
                    <input
                      type="text"
                      data-row={row.id}
                      data-field="miti"
                      value={row.miti}
                      onChange={(e) => updateField(row.id, "miti", e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, row.id, "miti")}
                      placeholder="2082-05-27"
                      className={`h-10 w-full rounded border bg-transparent px-3 text-sm tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        !row.miti.trim() && row.status !== "pending"
                          ? "border-destructive bg-destructive/5 focus:ring-destructive/40"
                          : "border-border/50"
                      }`}
                    />
                  </td>

                  <td className="px-1.5 py-1.5">
                    <PartyAutocomplete
                      allParties={allParties}
                      value={row.partyName}
                      partyId={row.partyId}
                      partyResolved={row.partyResolved}
                      rowId={row.id}
                      onSelect={(party) => selectParty(row.id, party)}
                      onSearchChange={(partyName) => searchParty(row.id, partyName)}
                      onGridKeyDown={(e, field) => handleCellKeyDown(e, row.id, field)}
                    />
                  </td>

                  <td className="px-1.5 py-1.5">
                    <input
                      type="text"
                      data-row={row.id}
                      data-field="invoiceNumber"
                      value={row.invoiceNumber}
                      onChange={(e) => updateField(row.id, "invoiceNumber", e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, row.id, "invoiceNumber")}
                      placeholder="INV-001"
                      className={`h-10 w-full rounded border bg-transparent px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        !row.invoiceNumber.trim() && row.status !== "pending"
                          ? "border-destructive bg-destructive/5 focus:ring-destructive/40"
                          : "border-border/50"
                      }`}
                    />
                  </td>

                  <td className="px-1.5 py-1.5">
                    <select
                      data-row={row.id}
                      data-field="categoryId"
                      value={row.categoryId}
                      onChange={(e) => {
                        const cat = allCategories.find((c) => c.id === e.target.value);
                        updateField(row.id, "categoryId", e.target.value, cat?.name ?? "");
                      }}
                      onKeyDown={(e) => handleCellKeyDown(e, row.id, "categoryId")}
                      className={`h-10 w-full rounded border bg-transparent px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        !row.categoryId && (row.miti || row.partyResolved || row.invoiceNumber || row.taxableAmount)
                          ? "text-muted-foreground border-destructive bg-destructive/5 focus:ring-destructive/40"
                          : !row.categoryId
                            ? "text-muted-foreground border-border/50"
                            : "border-border/50"
                      }`}
                    >
                      <option value="">Select...</option>
                      {allCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-1.5 py-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      data-row={row.id}
                      data-field="taxableAmount"
                      value={row.taxableAmount}
                      onChange={(e) => updateField(row.id, "taxableAmount", e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, row.id, "taxableAmount")}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`h-10 w-full rounded border bg-transparent px-3 text-right text-sm tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        (!row.taxableAmount || parseFloat(row.taxableAmount) <= 0) && row.status !== "pending"
                          ? "border-destructive/50"
                          : "border-border/50"
                      }`}
                    />
                  </td>

                  <td className="px-3 py-2 text-right text-sm text-muted-foreground tabular-amount">
                    {row.vatAmount ? formatAmount(parseFloat(row.vatAmount)) : "-"}
                  </td>

                  <td className="px-1.5 py-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      data-row={row.id}
                      data-field="totalAmount"
                      value={row.totalAmount}
                      onChange={(e) => updateField(row.id, "totalAmount", e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, row.id, "totalAmount")}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`h-10 w-full rounded border bg-transparent px-3 text-right text-sm tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                        (!row.totalAmount || parseFloat(row.totalAmount) <= 0) && row.status !== "pending"
                          ? "border-destructive/50"
                          : "border-border/50"
                      }`}
                    />
                  </td>

                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={row.status} />
                  </td>

                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateRow(row.id)}
                        title="Duplicate row (F2)"
                        aria-label="Duplicate row"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "REMOVE_ROW", rowId: row.id })}
                        title="Delete row (Esc)"
                        aria-label="Delete row"
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                    <td colSpan={9} className="px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>{row.error}</span>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "RESET_STATUS", rowId: row.id })}
                          className="ml-2 text-sm font-medium text-primary hover:underline"
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

      {/* Summary */}
      <LedgerSummary totals={totals} rowCount={enrichedRows.length} />

      {/* Actions */}
      <LedgerActions
        saving={saving}
        pendingCount={pendingCount}
        savedCount={savedCount}
        saveResult={saveResult}
        onAddRow={() => addRow()}
        onSave={saveAll}
        onClearSaved={() => dispatch({ type: "CLEAR_SAVED" })}
      />
    </div>
  );
}
