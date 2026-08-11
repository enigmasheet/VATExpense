"use client";

import { useCallback } from "react";
import type { LedgerRow, CellField } from "@/lib/expenses/ledger-types";
import { FIELD_ORDER } from "@/lib/expenses/ledger-types";

interface UseLedgerNavigationOptions {
  rows: LedgerRow[];
  gridRef: React.RefObject<HTMLDivElement | null>;
  addRow: (afterId?: string) => string;
  duplicateRow: (rowId: string) => void;
  removeRow: (rowId: string) => void;
  saveAll: () => void;
}

/**
 * Provides keyboard navigation and cell focus management for the ledger grid.
 *
 * @param rows - The current ledger rows, used to resolve adjacent rows during Tab navigation
 * @param gridRef - Reference to the grid container used to locate focusable cells
 * @param addRow - Adds a new row, optionally after a given row
 * @param duplicateRow - Duplicates an existing row
 * @param removeRow - Removes a row
 * @param saveAll - Triggers a batch save of all pending rows
 */
export function useLedgerNavigation({
  rows,
  gridRef,
  addRow,
  duplicateRow,
  removeRow,
  saveAll,
}: UseLedgerNavigationOptions) {
  /**
   * Focuses a cell within a row, selecting its content when the cell is an input.
   *
   * @param rowId - The identifier of the row containing the cell
   * @param field - The field name of the cell to focus
   */
  const focusField = useCallback(
    (rowId: string, field: CellField) => {
      setTimeout(() => {
        const el = gridRef.current?.querySelector<HTMLElement>(
          `[data-row="${rowId}"][data-field="${field}"]`,
        );
        el?.focus();
        if (el instanceof HTMLInputElement) el.select();
      }, 0);
    },
    [gridRef],
  );

  /**
   * Handles keyboard navigation and row actions for an editable ledger cell.
   *
   * @param e - The keyboard event from the cell
   * @param rowId - The identifier of the row containing the cell
   * @param field - The cell field receiving the event
   */
  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, rowId: string, field: CellField) => {
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
        (e.target as HTMLElement).blur();
      }
    },
    [rows, addRow, duplicateRow, removeRow, saveAll, focusField],
  );

  return { handleCellKeyDown };
}
