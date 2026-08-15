"use client";

import React from "react";
import { formatAmount } from "@/lib/format";
import { VAT_RATE } from "@/lib/constants";
import type { Party, Category, LedgerRow, CellField } from "@/lib/expenses/ledger-types";
import { PartyAutocomplete } from "./party-autocomplete";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";

/**
 * Determines whether a ledger row requires attention.
 *
 * @param row - The ledger row to evaluate
 * @returns `true` if the row has an error, duplicate, or incomplete status, `false` otherwise.
 */
function isIssueRow(row: LedgerRow): boolean {
  return row.status === "error" || row.status === "duplicate" || row.status === "incomplete";
}

function cellBg(status: LedgerRow["status"]): string {
  switch (status) {
    case "saved": return "bg-success/5";
    case "error": return "bg-danger/5";
    case "duplicate": return "bg-warning/5";
    default: return "";
  }
}

interface LedgerTableProps {
  rows: LedgerRow[];
  allParties: Party[];
  allCategories: Category[];
  onUpdateField: (rowId: string, field: string, value: string, categoryName?: string) => void;
  onSelectParty: (rowId: string, party: Party) => void;
  onSearchParty: (rowId: string, partyName: string) => void;
  onDuplicate: (rowId: string) => void;
  onRemove: (rowId: string) => void;
  onFix: (rowId: string) => void;
  onCellKeyDown: (e: React.KeyboardEvent, rowId: string, field: CellField) => void;
}

/**
 * Renders the editable expense table for the ledger grid.
 *
 * @param rows - The enriched ledger rows to display
 * @param allParties - Available parties for party selection
 * @param allCategories - Available expense categories
 * @param onUpdateField - Handles a cell value change
 * @param onSelectParty - Handles a party autocomplete selection
 * @param onSearchParty - Handles party search input changes
 * @param onDuplicate - Handles duplicating a row
 * @param onRemove - Handles removing a row
 * @param onFix - Handles resetting a row's error status
 * @param onCellKeyDown - Handles keyboard navigation within cells
 */
export function LedgerTable({
  rows,
  allParties,
  allCategories,
  onUpdateField,
  onSelectParty,
  onSearchParty,
  onDuplicate,
  onRemove,
  onFix,
  onCellKeyDown,
}: LedgerTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      {/* Desktop Table */}
      <table className="w-full text-left text-sm hidden md:table">
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
          {rows.map((row, idx) => (
            <React.Fragment key={row.id}>
              <tr className={`border-b border-border/30 last:border-b-0 ${cellBg(row.status)}`}>
                <td className="px-3 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>

                <td className="px-1.5 py-1.5">
                  <input
                    type="text"
                    data-row={row.id}
                    data-field="miti"
                    value={row.miti}
                    onChange={(e) => onUpdateField(row.id, "miti", e.target.value)}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "miti")}
                    placeholder="2082-05-27"
                    aria-label={`Miti for row ${idx + 1}`}
                    className={`h-10 w-full rounded border bg-transparent px-3 text-sm tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                      !row.miti.trim() && row.status !== "pending"
                        ? "border-destructive bg-danger/5 focus:ring-destructive/40"
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
                    onSelect={(party) => onSelectParty(row.id, party)}
                    onSearchChange={(partyName) => onSearchParty(row.id, partyName)}
                    onGridKeyDown={(e, field) => onCellKeyDown(e, row.id, field)}
                  />
                </td>

                <td className="px-1.5 py-1.5">
                  <input
                    type="text"
                    data-row={row.id}
                    data-field="invoiceNumber"
                    value={row.invoiceNumber}
                    onChange={(e) => onUpdateField(row.id, "invoiceNumber", e.target.value)}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "invoiceNumber")}
                    placeholder="INV-001"
                    aria-label={`Invoice number for row ${idx + 1}`}
                    className={`h-10 w-full rounded border bg-transparent px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                      !row.invoiceNumber.trim() && row.status !== "pending"
                        ? "border-destructive bg-danger/5 focus:ring-destructive/40"
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
                      onUpdateField(row.id, "categoryId", e.target.value, cat?.name ?? "");
                    }}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "categoryId")}
                    aria-label={`Category for row ${idx + 1}`}
                    className={`h-10 w-full rounded border bg-transparent px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                      !row.categoryId && (row.miti || row.partyResolved || row.invoiceNumber || row.taxableAmount)
                        ? "text-muted-foreground border-destructive bg-danger/5 focus:ring-destructive/40"
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
                    onChange={(e) => onUpdateField(row.id, "taxableAmount", e.target.value)}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "taxableAmount")}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    aria-label={`Taxable amount for row ${idx + 1}`}
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
                    onChange={(e) => onUpdateField(row.id, "totalAmount", e.target.value)}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "totalAmount")}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    aria-label={`Total amount for row ${idx + 1}`}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(row.id)}
                      title="Duplicate row (F2)"
                      aria-label="Duplicate row"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(row.id)}
                      title="Delete row (Esc)"
                      aria-label="Delete row"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </Button>
                  </div>
                </td>
              </tr>

              {/* Inline error row */}
              {isIssueRow(row) && row.error && (
                <tr className="border-b border-border/30 bg-danger/5">
                  <td></td>
                  <td colSpan={9} className="px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm text-danger">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span>{row.error}</span>
                      <button
                        type="button"
                        onClick={() => onFix(row.id)}
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

      {/* Mobile Cards */}
      <div className="md:hidden">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`border-b border-border/30 p-4 last:border-b-0 ${cellBg(row.status)}`}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                <StatusBadge status={row.status} />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(row.id)}
                  title="Duplicate row"
                  aria-label="Duplicate row"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(row.id)}
                  title="Delete row"
                  aria-label="Delete row"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Miti</label>
                <input
                  type="text"
                  data-row={row.id}
                  data-field="miti"
                  value={row.miti}
                  onChange={(e) => onUpdateField(row.id, "miti", e.target.value)}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, "miti")}
                  placeholder="2082-05-27"
                  aria-label={`Miti for row ${idx + 1}`}
                  className={`h-10 w-full rounded border bg-transparent px-3 text-sm tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                    !row.miti.trim() && row.status !== "pending"
                      ? "border-destructive bg-danger/5 focus:ring-destructive/40"
                      : "border-border/50"
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Party</label>
                <PartyAutocomplete
                  allParties={allParties}
                  value={row.partyName}
                  partyId={row.partyId}
                  partyResolved={row.partyResolved}
                  rowId={row.id}
                  onSelect={(party) => onSelectParty(row.id, party)}
                  onSearchChange={(partyName) => onSearchParty(row.id, partyName)}
                  onGridKeyDown={(e, field) => onCellKeyDown(e, row.id, field)}
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Invoice</label>
                <input
                  type="text"
                  data-row={row.id}
                  data-field="invoiceNumber"
                  value={row.invoiceNumber}
                  onChange={(e) => onUpdateField(row.id, "invoiceNumber", e.target.value)}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, "invoiceNumber")}
                  placeholder="INV-001"
                  aria-label={`Invoice number for row ${idx + 1}`}
                  className={`h-10 w-full rounded border bg-transparent px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                    !row.invoiceNumber.trim() && row.status !== "pending"
                      ? "border-destructive bg-danger/5 focus:ring-destructive/40"
                      : "border-border/50"
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Category</label>
                <select
                  data-row={row.id}
                  data-field="categoryId"
                  value={row.categoryId}
                  onChange={(e) => {
                    const cat = allCategories.find((c) => c.id === e.target.value);
                    onUpdateField(row.id, "categoryId", e.target.value, cat?.name ?? "");
                  }}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, "categoryId")}
                  aria-label={`Category for row ${idx + 1}`}
                  className={`h-10 w-full rounded border bg-transparent px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                    !row.categoryId && (row.miti || row.partyResolved || row.invoiceNumber || row.taxableAmount)
                      ? "text-muted-foreground border-destructive bg-danger/5 focus:ring-destructive/40"
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
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Excl. VAT</label>
                <input
                  type="number"
                  inputMode="decimal"
                  data-row={row.id}
                  data-field="taxableAmount"
                  value={row.taxableAmount}
                  onChange={(e) => onUpdateField(row.id, "taxableAmount", e.target.value)}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, "taxableAmount")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  aria-label={`Taxable amount for row ${idx + 1}`}
                  className={`h-10 w-full rounded border bg-transparent px-3 text-right text-sm tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                    (!row.taxableAmount || parseFloat(row.taxableAmount) <= 0) && row.status !== "pending"
                      ? "border-destructive/50"
                      : "border-border/50"
                  }`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Incl. VAT</label>
                <input
                  type="number"
                  inputMode="decimal"
                  data-row={row.id}
                  data-field="totalAmount"
                  value={row.totalAmount}
                  onChange={(e) => onUpdateField(row.id, "totalAmount", e.target.value)}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, "totalAmount")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  aria-label={`Total amount for row ${idx + 1}`}
                  className={`h-10 w-full rounded border bg-transparent px-3 text-right text-sm tabular-amount focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                    (!row.totalAmount || parseFloat(row.totalAmount) <= 0) && row.status !== "pending"
                      ? "border-destructive/50"
                      : "border-border/50"
                  }`}
                />
              </div>

              <div className="col-span-2 text-right text-sm text-muted-foreground">
                <span>VAT ({VAT_RATE}%): </span>
                <span className="tabular-amount">{row.vatAmount ? formatAmount(parseFloat(row.vatAmount)) : "-"}</span>
              </div>
            </div>

            {/* Inline error */}
            {isIssueRow(row) && row.error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-danger">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{row.error}</span>
                <button
                  type="button"
                  onClick={() => onFix(row.id)}
                  className="ml-2 text-sm font-medium text-primary hover:underline"
                >
                  Fix
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
