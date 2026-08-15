import type { LedgerRow } from "./ledger-types";
import { calcFromTaxable, calcFromTotal } from "./ledger-calculation";
import { createLedgerRow } from "./ledger-utils";
import {
  STATUS_PENDING,
  STATUS_SAVING,
  STATUS_SAVED,
  STATUS_ERROR,
} from "@/lib/status-constants";

export type LedgerAction =
  | {
      type: "UPDATE_FIELD";
      rowId: string;
      field: string;
      value: string;
      categoryName?: string;
    }
  | {
      type: "SELECT_PARTY";
      rowId: string;
      partyId: string;
      partyName: string;
      locationId: string | null;
      locationName: string | null;
    }
  | {
      type: "UPDATE_PARTY_SEARCH";
      rowId: string;
      partyName: string;
      partyId?: string;
      locationId?: string | null;
      locationName?: string | null;
    }
  | { type: "ADD_ROW"; afterId?: string; newRow: LedgerRow }
  | { type: "REMOVE_ROW"; rowId: string }
  | { type: "DUPLICATE_ROW"; newRow: LedgerRow; sourceIdx: number }
  | { type: "RESET_STATUS"; rowId: string }
  | { type: "CLEAR_SAVED" }
  | { type: "MARK_PENDING_AS_SAVING" }
  | {
      type: "SET_ROW_RESULT";
      rowId: string;
      status: typeof STATUS_SAVED | typeof STATUS_ERROR;
      error?: string;
      warnings?: string[];
    }
  | { type: "MARK_SAVING_AS_ERROR"; error: string }
  | {
      type: "APPLY_SAVE_RESULTS";
      results: Array<{
        rowId: string;
        ok: boolean;
        error?: string;
        warnings?: string[];
      }>;
    }
  | { type: "RESET_ROWS"; rows: LedgerRow[] };

function clearTerminalStatus(row: LedgerRow): LedgerRow {
  if (
    row.status !== STATUS_SAVED &&
    row.status !== STATUS_ERROR &&
    row.status !== STATUS_SAVING
  ) {
    return row;
  }
  return { ...row, status: STATUS_PENDING, error: undefined };
}

export function ledgerReducer(
  rows: LedgerRow[],
  action: LedgerAction,
): LedgerRow[] {
  switch (action.type) {
    case "UPDATE_FIELD": {
      return rows.map((r) => {
        if (r.id !== action.rowId) return r;

        let next = clearTerminalStatus(r);
        next = { ...next, [action.field]: action.value };

        if (action.field === "categoryId" && action.categoryName !== undefined) {
          next.categoryName = action.categoryName;
        }

        if (action.field === "taxableAmount") {
          const taxable = Number(action.value) || 0;
          if (taxable > 0) {
            const calc = calcFromTaxable(taxable);
            next.vatAmount = String(calc.vat);
            next.totalAmount = String(calc.total);
          } else {
            next.vatAmount = "";
            next.totalAmount = "";
          }
        } else if (action.field === "totalAmount") {
          const total = Number(action.value) || 0;
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
      });
    }

    case "SELECT_PARTY": {
      return rows.map((r) => {
        if (r.id !== action.rowId) return r;
        return {
          ...clearTerminalStatus(r),
          partyId: action.partyId,
          partyName: action.partyName,
          partyResolved: true,
          locationId: action.locationId,
          locationName: action.locationName,
        };
      });
    }

    case "UPDATE_PARTY_SEARCH": {
      return rows.map((r) => {
        if (r.id !== action.rowId) return r;
        const base = clearTerminalStatus(r);
        if (action.partyId !== undefined) {
          return {
            ...base,
            partyName: action.partyName,
            partyId: action.partyId,
            partyResolved: true,
            locationId: action.locationId ?? null,
            locationName: action.locationName ?? null,
          };
        }
        return {
          ...base,
          partyName: action.partyName,
          partyId: "",
          partyResolved: false,
          locationId: null,
          locationName: null,
        };
      });
    }

    case "ADD_ROW": {
      const idx = action.afterId
        ? rows.findIndex((r) => r.id === action.afterId)
        : rows.length - 1;
      const next = [...rows];
      next.splice(idx + 1, 0, action.newRow);
      return next;
    }

    case "REMOVE_ROW": {
      if (rows.length <= 1) return [createLedgerRow()];
      return rows.filter((r) => r.id !== action.rowId);
    }

    case "DUPLICATE_ROW": {
      const next = [...rows];
      next.splice(action.sourceIdx + 1, 0, action.newRow);
      return next;
    }

    case "RESET_STATUS": {
      return rows.map((r) => {
        if (r.id !== action.rowId) return r;
        return { ...r, status: STATUS_PENDING, error: undefined };
      });
    }

    case "CLEAR_SAVED": {
      return rows.filter((r) => r.status !== STATUS_SAVED);
    }

    case "MARK_PENDING_AS_SAVING": {
      return rows.map((r) =>
        r.status === STATUS_PENDING ? { ...r, status: STATUS_SAVING } : r,
      );
    }

    case "SET_ROW_RESULT": {
      return rows.map((r) => {
        if (r.id !== action.rowId) return r;
        return {
          ...r,
          status: action.status,
          error: action.error,
          warnings: action.warnings,
        };
      });
    }

    case "MARK_SAVING_AS_ERROR": {
      return rows.map((r) =>
        r.status === STATUS_SAVING
          ? { ...r, status: STATUS_ERROR, error: action.error }
          : r,
      );
    }

    case "APPLY_SAVE_RESULTS": {
      const resultById = new Map(
        action.results.map((r) => [r.rowId, r]),
      );
      return rows.map((r) => {
        const result = resultById.get(r.id);
        if (!result) return r;
        return {
          ...r,
          status: result.ok ? STATUS_SAVED : STATUS_ERROR,
          error: result.error,
          warnings: result.warnings,
        };
      });
    }

    case "RESET_ROWS": {
      return action.rows;
    }
  }
}
