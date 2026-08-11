"use client";

import { useCallback, useState } from "react";
import { batchSaveExpenses, type BatchRowInput } from "@/lib/actions/expenses";
import { getInvoiceKey } from "@/lib/expenses/ledger-utils";
import type { LedgerRow } from "@/lib/expenses/ledger-types";
import type { LedgerAction } from "@/lib/expenses/ledger-reducer";

export interface SaveResult {
  saved: number;
  errors: number;
}

/**
 * Encapsulates the batch save pipeline for the expense ledger.
 *
 * Captures pending row IDs once, builds the batch input, calls the server
 * action, and applies all row results in a single state update.
 */
export function useLedgerSave({
  enrichedRows,
  fiscalYearId,
  dispatch,
  setExistingInvoices,
  defaultVatRate = "13.00",
}: {
  enrichedRows: LedgerRow[];
  fiscalYearId: string;
  dispatch: React.Dispatch<LedgerAction>;
  setExistingInvoices: React.Dispatch<React.SetStateAction<Set<string>>>;
  defaultVatRate?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const saveAll = useCallback(async () => {
    const pending = enrichedRows.filter((r) => r.status === "pending");
    if (pending.length === 0) return;

    setSaving(true);
    setSaveResult(null);
    setStatusMessage(
      `Saving ${pending.length} row${pending.length > 1 ? "s" : ""}...`,
    );

    // Mark all pending rows as saving in one dispatch
    dispatch({ type: "MARK_PENDING_AS_SAVING" });

    // Capture IDs before the async boundary
    const pendingIds = pending.map((r) => r.id);

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
      vatRate: defaultVatRate,
    }));

    const result = await batchSaveExpenses(batchInputs);

    if (result.ok) {
      // Build all row updates and apply in one dispatch
      const rowUpdates = result.data.map((r) => ({
        rowId: pendingIds[r.index],
        ok: r.ok,
        error: r.error,
        warnings: r.warnings,
      }));

      dispatch({ type: "APPLY_SAVE_RESULTS", results: rowUpdates });

      // Update existing invoice index
      const newlySaved: string[] = [];
      for (let i = 0; i < result.data.length; i++) {
        const r = result.data[i];
        if (r.ok && pending[i].invoiceNumber) {
          newlySaved.push(
            getInvoiceKey(pending[i].partyId, pending[i].invoiceNumber),
          );
        }
      }
      if (newlySaved.length > 0) {
        setExistingInvoices((prev) => new Set([...prev, ...newlySaved]));
      }

      const savedCount = result.data.filter((r) => r.ok).length;
      const errorCount = result.data.filter((r) => !r.ok).length;
      setSaveResult({ saved: savedCount, errors: errorCount });
      setStatusMessage(
        `Saved ${savedCount} expense${savedCount > 1 ? "s" : ""}.${errorCount > 0 ? ` ${errorCount} error(s).` : ""}`,
      );

      if (savedCount > 0) {
        setTimeout(() => {
          dispatch({ type: "CLEAR_SAVED" });
        }, 2000);
      }
    } else {
      dispatch({ type: "MARK_SAVING_AS_ERROR", error: result.error });
      setSaveResult({ saved: 0, errors: pending.length });
      setStatusMessage(`Failed to save: ${result.error}`);
    }

    setSaving(false);
  }, [enrichedRows, fiscalYearId, dispatch, setExistingInvoices]);

  return { saving, saveResult, statusMessage, saveAll };
}
