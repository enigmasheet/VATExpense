"use client";

import React from "react";
import { formatAmount } from "@/lib/format";
import { VAT_RATE } from "@/lib/constants";
import {
  STATUS_PENDING,
  STATUS_ERROR,
  STATUS_DUPLICATE,
  STATUS_INCOMPLETE,
  STATUS_SAVED,
  STATUS_SAVING,
} from "@/lib/status-constants";
import type { Party, Category, LedgerRow, CellField } from "@/lib/expenses/ledger-types";
import { getFixableAction } from "@/lib/expenses/ledger-validation";
import type { FixableAction } from "@/lib/expenses/ledger-validation";
import { formatMitiInput } from "@/lib/expenses/ledger-utils";
import { PartyAutocomplete } from "./party-autocomplete";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";

function isIssueRow(row: LedgerRow): boolean {
  return row.status === STATUS_ERROR || row.status === STATUS_DUPLICATE || row.status === STATUS_INCOMPLETE;
}

function cellBg(status: LedgerRow["status"]): string {
  switch (status) {
    case STATUS_SAVED: return "bg-success/8";
    case STATUS_SAVING: return "bg-primary/5";
    case STATUS_ERROR: return "bg-danger/10";
    case STATUS_DUPLICATE: return "bg-warning/10";
    case STATUS_INCOMPLETE: return "bg-surface";
    default: return "";
  }
}

function inputClass(hasError: boolean, isEmpty: boolean): string {
  const base = "h-9 w-full rounded border bg-transparent px-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors";
  if (hasError) return `${base} border-danger/40 bg-danger/5 focus:ring-danger/30`;
  if (isEmpty) return `${base} text-muted-foreground border-border/50`;
  return `${base} border-border/50 hover:border-border`;
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
  onFix: (rowId: string, action: FixableAction) => void;
  onCellKeyDown: (e: React.KeyboardEvent, rowId: string, field: CellField) => void;
}

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
          <tr className="border-b border-border/50 bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground sticky top-0 z-10">
            <th className="w-8 px-2 py-2.5 text-center">#</th>
            <th className="w-24 px-2 py-2.5">Miti</th>
            <th className="px-2 py-2.5">Party</th>
            <th className="w-28 px-2 py-2.5">Invoice</th>
            <th className="w-32 px-2 py-2.5">Category</th>
            <th className="w-16 px-2 py-2.5 text-right">Qty</th>
            <th className="w-20 px-2 py-2.5 text-right">Rate</th>
            <th className="w-24 px-2 py-2.5 text-right">Excl. VAT</th>
            <th className="w-20 px-2 py-2.5 text-right">VAT ({VAT_RATE}%)</th>
            <th className="w-24 px-2 py-2.5 text-right">Incl. VAT</th>
            <th className="w-20 px-2 py-2.5 text-center">Status</th>
            <th className="w-16 px-2 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <React.Fragment key={row.id}>
              <tr className={`border-b border-border/30 last:border-b-0 transition-colors hover:bg-muted/20 ${cellBg(row.status)}`}>
                <td className="px-2 py-1.5 text-center text-xs text-muted-foreground">{idx + 1}</td>

                <td className="px-1 py-1">
                  <input
                    type="text"
                    data-row={row.id}
                    data-field="miti"
                    value={row.miti}
                    onChange={(e) => onUpdateField(row.id, "miti", formatMitiInput(e.target.value))}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "miti")}
                    placeholder="2083-04-15"
                    aria-label={`Miti for row ${idx + 1}`}
                    className={inputClass(
                      !row.miti.trim() && row.status !== STATUS_PENDING,
                      !row.miti.trim()
                    )}
                  />
                </td>

                <td className="px-1 py-1">
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

                <td className="px-1 py-1">
                  <input
                    type="text"
                    data-row={row.id}
                    data-field="invoiceNumber"
                    value={row.invoiceNumber}
                    onChange={(e) => onUpdateField(row.id, "invoiceNumber", e.target.value)}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "invoiceNumber")}
                    placeholder="INV-001"
                    aria-label={`Invoice number for row ${idx + 1}`}
                    className={inputClass(
                      !row.invoiceNumber.trim() && row.status !== STATUS_PENDING,
                      !row.invoiceNumber.trim()
                    )}
                  />
                </td>

                <td className="px-1 py-1">
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
                    className={inputClass(
                      !!(!row.categoryId && (row.miti || row.partyResolved || row.invoiceNumber || row.taxableAmount)),
                      !row.categoryId
                    )}
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
                    data-field="quantity"
                    value={row.quantity}
                    onChange={(e) => onUpdateField(row.id, "quantity", e.target.value)}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "quantity")}
                    placeholder="0"
                    min="0"
                    step="0.001"
                    aria-label={`Quantity for row ${idx + 1}`}
                    className={`${inputClass(false, !row.quantity)} text-right tabular-amount`}
                  />
                </td>

                <td className="px-1 py-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    data-row={row.id}
                    data-field="rate"
                    value={row.rate}
                    onChange={(e) => onUpdateField(row.id, "rate", e.target.value)}
                    onKeyDown={(e) => onCellKeyDown(e, row.id, "rate")}
                    placeholder="0.00"
                    min="0"
                    step="0.0001"
                    aria-label={`Rate for row ${idx + 1}`}
                    className={`${inputClass(false, !row.rate)} text-right tabular-amount`}
                  />
                </td>

                <td className="px-1 py-1">
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
                    className={`${inputClass(
                      (!row.taxableAmount || parseFloat(row.taxableAmount) <= 0) && row.status !== STATUS_PENDING,
                      !row.taxableAmount
                    )} text-right tabular-amount`}
                  />
                </td>

                <td className="px-2 py-1.5 text-right text-sm text-muted-foreground tabular-amount">
                  {row.vatAmount ? formatAmount(parseFloat(row.vatAmount)) : "-"}
                </td>

                <td className="px-1 py-1">
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
                    className={`${inputClass(
                      (!row.totalAmount || parseFloat(row.totalAmount) <= 0) && row.status !== STATUS_PENDING,
                      !row.totalAmount
                    )} text-right tabular-amount`}
                  />
                </td>

                <td className="px-2 py-1.5 text-center">
                  <StatusBadge status={row.status} />
                </td>

                <td className="px-2 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(row.id)}
                      title="Duplicate row (F2)"
                      aria-label="Duplicate row"
                      className="h-9 w-9 !px-0"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(row.id)}
                      title="Delete row (Esc)"
                      aria-label="Delete row"
                      className="h-9 w-9 !px-0 text-danger hover:text-danger"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </Button>
                  </div>
                </td>
              </tr>

              {/* Inline error row */}
              {isIssueRow(row) && row.error && (() => {
                const fixAction = getFixableAction(row.error);
                return (
                  <tr className="border-b border-border/30 bg-danger/5">
                    <td></td>
                    <td colSpan={9} className="px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-danger">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>{row.error}</span>
                        {fixAction && (
                          <button
                            type="button"
                            onClick={() => onFix(row.id, fixAction)}
                            className="ml-2 text-sm font-medium text-primary hover:underline"
                          >
                            {fixAction.label}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })()}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`border-b border-border/30 p-3 last:border-b-0 transition-colors ${cellBg(row.status)}`}
          >
            <div className="mb-2.5 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                <StatusBadge status={row.status} />
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(row.id)}
                  title="Duplicate row"
                  aria-label="Duplicate row"
                  className="h-9 w-9 !px-0"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(row.id)}
                  title="Delete row"
                  aria-label="Delete row"
                  className="h-9 w-9 !px-0 text-danger hover:text-danger"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Miti</label>
                <input
                  type="text"
                  data-row={row.id}
                  data-field="miti"
                  value={row.miti}
                  onChange={(e) => onUpdateField(row.id, "miti", formatMitiInput(e.target.value))}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, "miti")}
                  placeholder="2083-04-15"
                  aria-label={`Miti for row ${idx + 1}`}
                  className={inputClass(
                    !row.miti.trim() && row.status !== STATUS_PENDING,
                    !row.miti.trim()
                  )}
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
                  className={inputClass(
                    !row.invoiceNumber.trim() && row.status !== STATUS_PENDING,
                    !row.invoiceNumber.trim()
                  )}
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
                  className={inputClass(
                    !!(!row.categoryId && (row.miti || row.partyResolved || row.invoiceNumber || row.taxableAmount)),
                    !row.categoryId
                  )}
                >
                  <option value="">Select...</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Qty</label>
                <input
                  type="number"
                  inputMode="decimal"
                  data-row={row.id}
                  data-field="quantity"
                  value={row.quantity}
                  onChange={(e) => onUpdateField(row.id, "quantity", e.target.value)}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, "quantity")}
                  placeholder="0"
                  min="0"
                  step="0.001"
                  aria-label={`Quantity for row ${idx + 1}`}
                  className={`${inputClass(false, !row.quantity)} text-right tabular-amount`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Rate</label>
                <input
                  type="number"
                  inputMode="decimal"
                  data-row={row.id}
                  data-field="rate"
                  value={row.rate}
                  onChange={(e) => onUpdateField(row.id, "rate", e.target.value)}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, "rate")}
                  placeholder="0.00"
                  min="0"
                  step="0.0001"
                  aria-label={`Rate for row ${idx + 1}`}
                  className={`${inputClass(false, !row.rate)} text-right tabular-amount`}
                />
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
                  className={`${inputClass(
                    (!row.taxableAmount || parseFloat(row.taxableAmount) <= 0) && row.status !== STATUS_PENDING,
                    !row.taxableAmount
                  )} text-right tabular-amount`}
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
                  className={`${inputClass(
                    (!row.totalAmount || parseFloat(row.totalAmount) <= 0) && row.status !== STATUS_PENDING,
                    !row.totalAmount
                  )} text-right tabular-amount`}
                />
              </div>

              <div className="col-span-2 text-right text-sm text-muted-foreground">
                <span>VAT ({VAT_RATE}%): </span>
                <span className="tabular-amount">{row.vatAmount ? formatAmount(parseFloat(row.vatAmount)) : "-"}</span>
              </div>
            </div>

            {/* Inline error */}
            {isIssueRow(row) && row.error && (() => {
              const fixAction = getFixableAction(row.error);
              return (
                <div className="mt-2 flex items-center gap-2 text-sm text-danger">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span>{row.error}</span>
                  {fixAction && (
                    <button
                      type="button"
                      onClick={() => onFix(row.id, fixAction)}
                      className="ml-2 text-sm font-medium text-primary hover:underline"
                    >
                      {fixAction.label}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
