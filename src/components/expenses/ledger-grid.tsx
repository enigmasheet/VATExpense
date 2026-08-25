"use client";

import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLedgerSave } from "@/hooks/expenses/use-ledger-save";
import { useLedgerNavigation } from "@/hooks/expenses/use-ledger-navigation";
import { ledgerReducer } from "@/lib/expenses/ledger-reducer";
import { createLedgerRow, getInvoiceKey } from "@/lib/expenses/ledger-utils";
import { validateLedgerRow, buildDuplicateIndex } from "@/lib/expenses/ledger-validation";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VAT_RATE } from "@/lib/constants";
import {
  STATUS_PENDING,
  STATUS_SAVING,
  STATUS_SAVED,
  STATUS_ERROR,
  STATUS_DUPLICATE,
} from "@/lib/status-constants";
import type { Party, Category, LedgerRow } from "@/lib/expenses/ledger-types";
import { LedgerTable } from "./ledger-table";
import { LedgerSummary } from "./ledger-summary";
import { LedgerActions } from "./ledger-actions";

interface LedgerGridProps {
  companyId: string;
  fiscalYearId: string;
  fiscalYearName: string;
  allParties: Party[];
  allCategories: Category[];
  defaultVatRate?: string;
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
  defaultVatRate,
}: LedgerGridProps) {
  const [rows, dispatch] = useReducer(ledgerReducer, [createLedgerRow()]);
  const [existingInvoices, setExistingInvoices] = useState<Set<string>>(new Set());
  const [existingInvoicesError, setExistingInvoicesError] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const prevErrorsRef = useRef<Map<string, string>>(new Map());
  const prevRowCountRef = useRef(rows.length);

  // Confirmation dialog for deleting rows with data
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteRow = pendingDeleteId ? rows.find((r) => r.id === pendingDeleteId) : null;
  const pendingDeleteHasData = pendingDeleteRow
    ? !!(pendingDeleteRow.partyId || pendingDeleteRow.invoiceNumber || pendingDeleteRow.taxableAmount)
    : false;

  // Auto-focus the first input of a newly added row
  useEffect(() => {
    if (rows.length > prevRowCountRef.current && gridRef.current) {
      const newRow = rows[rows.length - 1];
      const selector = `input[data-row="${newRow.id}"][data-field="miti"]`;
      const el = gridRef.current.querySelector<HTMLInputElement>(selector);
      if (el) {
        requestAnimationFrame(() => el.focus());
      }
    }
    prevRowCountRef.current = rows.length;
  }, [rows]);

  useEffect(() => {
    if (!companyId || !fiscalYearId) return;

    let cancelled = false;
    const controller = new AbortController();

    fetch(
      `/api/expenses/invoice-keys?companyId=${companyId}&fiscalYearId=${fiscalYearId}`,
      { signal: controller.signal, credentials: "include" },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
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
      if (row.status === STATUS_SAVING || row.status === STATUS_SAVED || row.status === STATUS_ERROR) {
        return row;
      }
      const result = validateLedgerRow(row, duplicateIndex, existingInvoices, fiscalYearName);
      return { ...row, status: result.status, error: result.error, warnings: result.warnings };
    });
  }, [rows, duplicateIndex, existingInvoices, fiscalYearName]);

  // Toast when new errors appear (duplicates, FY mismatches)
  useEffect(() => {
    const prevErrors = prevErrorsRef.current;
    for (const row of enrichedRows) {
      const prevError = prevErrors.get(row.id);
      if (row.error && row.error !== prevError) {
        if (row.error.includes("already exists") || row.error.includes("falls in FY")) {
          toast(row.error, "error");
        }
      }
    }
    const nextErrors = new Map<string, string>();
    for (const row of enrichedRows) {
      if (row.error) nextErrors.set(row.id, row.error);
    }
    prevErrorsRef.current = nextErrors;
  }, [enrichedRows, toast]);

  const { saving, saveResult, statusMessage, saveAll } = useLedgerSave({
    enrichedRows,
    fiscalYearId,
    dispatch,
    setExistingInvoices,
    defaultVatRate,
  });

  const totals = useMemo(() => {
    const valid = enrichedRows.filter((r) => r.status === STATUS_PENDING || r.status === STATUS_SAVING || r.status === STATUS_SAVED);
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

  const pendingCount = enrichedRows.filter((r) => r.status === STATUS_PENDING).length;
  const savedCount = enrichedRows.filter((r) => r.status === STATUS_SAVED).length;
  const errorCount = enrichedRows.filter((r) => r.status === STATUS_ERROR).length;
  const duplicateCount = enrichedRows.filter((r) => r.status === STATUS_DUPLICATE).length;

  function updateField(rowId: string, field: string, value: string, categoryName?: string) {
    const vatRate = Number(defaultVatRate) || VAT_RATE;
    dispatch({ type: "UPDATE_FIELD", rowId, field, value, categoryName, vatRate });
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
      status: STATUS_PENDING,
      error: undefined,
      warnings: undefined,
    };
    dispatch({ type: "DUPLICATE_ROW", newRow, sourceIdx: idx });
  }

  const { handleCellKeyDown } = useLedgerNavigation({
    rows,
    gridRef,
    addRow,
    duplicateRow,
    removeRow: (rowId) => dispatch({ type: "REMOVE_ROW", rowId }),
    saveAll,
  });

  return (
    <div className="flex flex-col gap-3" ref={gridRef}>
      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {/* Invoice index load error */}
      {existingInvoicesError && (
        <Alert kind="warning">
          Unable to load existing invoices — duplicate detection may be incomplete. Please refresh to retry.
        </Alert>
      )}

      {/* Table */}
      <LedgerTable
        rows={enrichedRows}
        allParties={allParties}
        allCategories={allCategories}
        onUpdateField={updateField}
        onSelectParty={selectParty}
        onSearchParty={searchParty}
        onDuplicate={duplicateRow}
        onRemove={(rowId) => dispatch({ type: "REMOVE_ROW", rowId })}
        onFix={(rowId, action) => dispatch({
          type: "AUTO_FIX",
          rowId,
          fixType: action.fixType,
          value: action.value,
          categoryName: action.categoryName,
        })}
        onCellKeyDown={handleCellKeyDown}
      />

      {/* Summary */}
      <LedgerSummary totals={totals} rowCount={enrichedRows.length} errorCount={errorCount} duplicateCount={duplicateCount} />

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
