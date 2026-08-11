"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/use-app";
import { round2 } from "@/lib/money";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

const VAT_RATE = 13;
const VAT_FACTOR = 1 + VAT_RATE / 100;

interface Party {
  id: string;
  name: string;
  vatNumber: string | null;
  locationId: string | null;
  locationName: string | null;
}

interface QueueItem {
  id: string;
  miti: string;
  invoiceNumber: string;
  partyId: string;
  partyName: string;
  locationId: string | null;
  locationName: string | null;
  categoryId: string;
  categoryName: string;
  item: string;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  status: "pending" | "saving" | "saved" | "error";
  error?: string;
  warnings?: string[];
}

interface SharedDefaults {
  miti: string;
  categoryId: string;
  locationId: string;
}

function calcFromTotal(total: number) {
  const taxable = round2(total / VAT_FACTOR);
  const vat = round2(total - taxable);
  return { taxable, vat };
}

function calcFromTaxable(taxable: number) {
  const vat = round2((taxable * VAT_RATE) / 100);
  const total = round2(taxable + vat);
  return { vat, total };
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export function BatchEntry() {
  const { companyId, fiscalYearId, fiscalYears } = useApp();

  const [defaults, setDefaults] = useState<SharedDefaults>({
    miti: "",
    categoryId: "",
    locationId: "",
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  // Quick entry row state
  const [vatInput, setVatInput] = useState("");
  const [resolvedParty, setResolvedParty] = useState<Party | null>(null);
  const [vatLookupError, setVatLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [entryCategoryId, setEntryCategoryId] = useState("");
  const [item, setItem] = useState("");
  const [amountMode, setAmountMode] = useState<"total" | "taxable">("total");
  const [amount, setAmount] = useState("");

  // Inline party creation
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyLocationId, setNewPartyLocationId] = useState("");
  const [creatingParty, setCreatingParty] = useState(false);
  const [createPartyError, setCreatePartyError] = useState<string | null>(null);

  // Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSummary, setSaveSummary] = useState<{ saved: number; errors: number } | null>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<QueueItem>>({});

  // Refs for focus management
  const vatRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Load master data
  useEffect(() => {
    if (!companyId) return;
    api<{ data: { id: string; name: string }[] }>(`/api/categories?companyId=${companyId}`).then(({ data }) => setCategories(data));
    api<{ data: { id: string; name: string }[] }>(`/api/locations?companyId=${companyId}`).then(({ data }) => setLocations(data));
  }, [companyId]);

  // Derived: computed amounts from input
  const computedAmounts = (() => {
    const num = Number(amount);
    if (!amount || !Number.isFinite(num) || num <= 0) {
      return { taxable: "", vat: "", total: "" };
    }
    if (amountMode === "total") {
      const { taxable, vat } = calcFromTotal(num);
      return { taxable: String(taxable), vat: String(vat), total: String(round2(num)) };
    }
    const { vat, total } = calcFromTaxable(num);
    return { taxable: String(round2(num)), vat: String(vat), total: String(total) };
  })();

  // Derived: effective item name (auto-fill from category if user hasn't typed)
  const effectiveCategoryId = entryCategoryId || defaults.categoryId;
  const categoryAutoItem = effectiveCategoryId
    ? categories.find((c) => c.id === effectiveCategoryId)?.name ?? ""
    : "";
  const displayItem = item || categoryAutoItem;

  const lookupVat = useCallback(
    async (vat: string) => {
      if (!companyId || !vat.trim()) return;
      setLookingUp(true);
      setVatLookupError(null);
      setResolvedParty(null);
      try {
        const res = await api<{ data: Party }>(
          `/api/parties/by-vat?vat=${encodeURIComponent(vat)}&companyId=${companyId}`,
        );
        setResolvedParty(res.data);
        // Auto-fill location from party if no shared location
        if (!defaults.locationId && res.data.locationId) {
          setDefaults((d) => ({ ...d, locationId: res.data.locationId! }));
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setVatLookupError(`No party found for VAT# "${vat}"`);
          setShowCreateParty(true);
          setNewPartyName("");
          setNewPartyLocationId(defaults.locationId);
        } else {
          setVatLookupError("Lookup failed. Try again.");
        }
      } finally {
        setLookingUp(false);
      }
    },
    [companyId, defaults.locationId],
  );

  async function createPartyInline() {
    if (!companyId || !newPartyName.trim()) return;
    setCreatingParty(true);
    setCreatePartyError(null);
    try {
      const created = await api<{ data: Party }>("/api/parties", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          name: newPartyName.trim(),
          vatNumber: vatInput || null,
          locationId: newPartyLocationId || null,
          isActive: true,
        }),
      });
      const p = created.data;
      setResolvedParty(p);
      setShowCreateParty(false);
      setVatLookupError(null);
    } catch (err) {
      setCreatePartyError(err instanceof ApiError ? err.detail : "Failed to create party");
    } finally {
      setCreatingParty(false);
    }
  }

  function addToQueue() {
    const catId = entryCategoryId || defaults.categoryId;
    const catName = categories.find((c) => c.id === catId)?.name ?? "";
    const effectiveLocationId = resolvedParty?.locationId || defaults.locationId || null;
    const effectiveLocationName = resolvedParty?.locationName || locations.find((l) => l.id === defaults.locationId)?.name || null;

    if (!resolvedParty) {
      vatRef.current?.focus();
      return;
    }
    if (!catId) {
      return;
    }
    const totalNum = Number(computedAmounts.total || amount);
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      amountRef.current?.focus();
      return;
    }

    const newItem: QueueItem = {
      id: genId(),
      miti: defaults.miti,
      invoiceNumber: invoiceNumber.trim(),
      partyId: resolvedParty.id,
      partyName: resolvedParty.name,
      locationId: effectiveLocationId,
      locationName: effectiveLocationName,
      categoryId: catId,
      categoryName: catName,
      item: displayItem.trim() || categoryAutoItem,
      taxableAmount: computedAmounts.taxable || amount,
      vatAmount: computedAmounts.vat || "0",
      totalAmount: computedAmounts.total || amount,
      status: "pending",
    };

    setQueue((q) => [...q, newItem]);

    // Reset entry row (keep defaults, clear party-specific fields)
    setVatInput("");
    setResolvedParty(null);
    setInvoiceNumber("");
    setItem("");
    setAmount("");
    setVatLookupError(null);
    setShowCreateParty(false);

    // Focus back to VAT input for next entry
    setTimeout(() => vatRef.current?.focus(), 0);
  }

  function removeFromQueue(id: string) {
    setQueue((q) => q.filter((item) => item.id !== id));
  }

  function startEdit(item: QueueItem) {
    setEditingId(item.id);
    setEditValues({
      miti: item.miti,
      invoiceNumber: item.invoiceNumber,
      categoryId: item.categoryId,
      item: item.item,
      taxableAmount: item.taxableAmount,
      totalAmount: item.totalAmount,
    });
  }

  function saveEdit() {
    if (!editingId || !editValues) return;
    setQueue((q) =>
      q.map((item) => {
        if (item.id !== editingId) return item;
        const total = Number(editValues.totalAmount);
        const { taxable, vat } = calcFromTotal(total);
        return {
          ...item,
          miti: editValues.miti ?? item.miti,
          invoiceNumber: editValues.invoiceNumber ?? item.invoiceNumber,
          categoryId: editValues.categoryId ?? item.categoryId,
          categoryName: categories.find((c) => c.id === editValues.categoryId)?.name ?? item.categoryName,
          item: editValues.item ?? item.item,
          taxableAmount: String(taxable),
          vatAmount: String(vat),
          totalAmount: String(total),
          status: "pending" as const,
          error: undefined,
        };
      }),
    );
    setEditingId(null);
    setEditValues({});
  }

  async function saveAll() {
    if (!companyId || !fiscalYearId) return;
    const pending = queue.filter((q) => q.status === "pending");
    if (pending.length === 0) return;

    setSaving(true);
    setSaveSummary(null);

    let savedCount = 0;
    let errorCount = 0;

    for (const item of pending) {
      setQueue((q) =>
        q.map((r) => (r.id === item.id ? { ...r, status: "saving" as const } : r)),
      );

      try {
        const res = await api<{ data: unknown; warnings?: string[] }>("/api/expenses", {
          method: "POST",
          body: JSON.stringify({
            companyId,
            fiscalYearId,
            miti: item.miti,
            invoiceNumber: item.invoiceNumber || null,
            partyId: item.partyId,
            categoryId: item.categoryId,
            locationId: item.locationId,
            item: item.item,
            taxableAmount: item.taxableAmount,
            vatAmount: item.vatAmount,
            totalAmount: item.totalAmount,
            vatRate: "13.00",
          }),
        });
        savedCount++;
        setQueue((q) =>
          q.map((r) =>
            r.id === item.id
              ? { ...r, status: "saved" as const, warnings: res.warnings }
              : r,
          ),
        );
      } catch (err) {
        errorCount++;
        const detail = err instanceof ApiError ? err.detail : "Save failed";
        setQueue((q) =>
          q.map((r) =>
            r.id === item.id ? { ...r, status: "error" as const, error: detail } : r,
          ),
        );
      }
    }

    setSaveSummary({ saved: savedCount, errors: errorCount });
    setSaving(false);
  }

  if (fiscalYears.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">Create a fiscal year first — expenses are filed under one.</p>
      </div>
    );
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Shared defaults */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">Defaults for all entries</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Invoice date (BS)" htmlFor="def-miti">
            <Input
              id="def-miti"
              required
              placeholder="2082-04-05"
              value={defaults.miti}
              onChange={(e) => setDefaults((d) => ({ ...d, miti: e.target.value }))}
            />
          </Field>
          <Field label="Category (optional default)" htmlFor="def-category">
            <Select
              id="def-category"
              value={defaults.categoryId}
              onChange={(e) => setDefaults((d) => ({ ...d, categoryId: e.target.value }))}
            >
              <option value="">— per entry —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Location (optional default)" htmlFor="def-location">
            <Select
              id="def-location"
              value={defaults.locationId}
              onChange={(e) => setDefaults((d) => ({ ...d, locationId: e.target.value }))}
            >
              <option value="">— per entry —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      {/* Quick entry row */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">Add invoice</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* VAT Number */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Party VAT#</label>
            <input
              ref={vatRef}
              type="text"
              value={vatInput}
              onChange={(e) => setVatInput(e.target.value)}
              onBlur={() => lookupVat(vatInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookupVat(vatInput);
                }
              }}
              placeholder="Type VAT# → lookup"
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-primary"
            />
            {lookingUp && <p className="text-xs text-muted">Looking up…</p>}
            {resolvedParty && (
              <div className="rounded-md bg-success-bg p-2 text-xs text-success">
                <span className="font-medium">{resolvedParty.name}</span>
                {resolvedParty.locationName && (
                  <span className="ml-1 text-muted">· {resolvedParty.locationName}</span>
                )}
              </div>
            )}
            {vatLookupError && !showCreateParty && (
              <p className="text-xs text-danger">{vatLookupError}</p>
            )}
          </div>

          {/* Invoice number */}
          <Field label="Invoice#" htmlFor="entry-invoice">
            <input
              ref={invoiceRef}
              type="text"
              id="entry-invoice"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Optional"
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-primary"
            />
          </Field>

          {/* Category */}
          <Field label="Category" htmlFor="entry-category">
            <select
              id="entry-category"
              value={entryCategoryId}
              onChange={(e) => setEntryCategoryId(e.target.value)}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-primary"
            >
              <option value="">{defaults.categoryId ? `Use default (${categories.find((c) => c.id === defaults.categoryId)?.name})` : "Select category"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {amountMode === "total" ? "Total (incl. VAT)" : "Taxable (excl. VAT)"}
              </label>
              <button
                type="button"
                onClick={() => setAmountMode((m) => (m === "total" ? "taxable" : "total"))}
                className="text-xs text-primary hover:underline"
              >
                Switch to {amountMode === "total" ? "taxable" : "total"}
              </button>
            </div>
            <input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToQueue();
                }
              }}
              placeholder="Amount"
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-primary"
            />
          </div>

          {/* Computed display */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Computed</label>
            <div className="flex h-10 items-center rounded-md bg-surface-muted px-3 text-sm tabular-amount">
              {amount ? (
                <span>
                  Tax: {computedAmounts.taxable ? `Rs. ${Number(computedAmounts.taxable).toLocaleString()}` : "–"} ·
                  VAT: {computedAmounts.vat ? `Rs. ${Number(computedAmounts.vat).toLocaleString()}` : "–"}
                </span>
              ) : (
                <span className="text-muted">Enter amount</span>
              )}
            </div>
          </div>

          {/* Item / description */}
          <Field label="Description" htmlFor="entry-item">
            <input
              id="entry-item"
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToQueue();
                }
              }}
              placeholder={effectiveCategoryId ? categories.find((c) => c.id === effectiveCategoryId)?.name : "Item description"}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-primary"
            />
          </Field>
        </div>

        {/* Inline party creation */}
        {showCreateParty && (
          <div className="rounded-lg border border-warning/30 bg-warning-bg p-4">
            <p className="mb-3 text-sm font-medium text-warning">
              Party not found. Create a new one:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Party name" htmlFor="new-party-name">
                <input
                  id="new-party-name"
                  type="text"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Supplier name"
                  className="h-10 rounded-md border border-border bg-surface px-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-primary"
                />
              </Field>
              <Field label="Location" htmlFor="new-party-location">
                <select
                  id="new-party-location"
                  value={newPartyLocationId}
                  onChange={(e) => setNewPartyLocationId(e.target.value)}
                  className="h-10 rounded-md border border-border bg-surface px-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-primary"
                >
                  <option value="">— none —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end gap-2">
                <Button
                  size="sm"
                  onClick={createPartyInline}
                  disabled={creatingParty || !newPartyName.trim()}
                >
                  {creatingParty ? "Creating…" : "Create & Use"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateParty(false);
                    setCreatePartyError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
            {createPartyError && <p className="mt-2 text-xs text-danger">{createPartyError}</p>}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={addToQueue}
            disabled={!resolvedParty || !computedAmounts.total || !defaults.miti}
          >
            Add to queue
          </Button>
          <span className="text-xs text-muted">
            {defaults.miti ? `Date: ${defaults.miti}` : "Set date above first"}
            {resolvedParty ? ` · Party: ${resolvedParty.name}` : " · Type VAT# to start"}
          </span>
        </div>
      </section>

      {/* Queue table */}
      {queue.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              Queue ({queue.length} item{queue.length === 1 ? "" : "s"})
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setQueue([])}
                disabled={saving}
              >
                Clear all
              </Button>
              <Button
                size="sm"
                onClick={saveAll}
                disabled={saving || pendingCount === 0}
              >
                {saving ? "Saving…" : `Save ${pendingCount} pending`}
              </Button>
            </div>
          </div>

          {saveSummary && (
            <div className={`rounded-lg border p-3 text-sm ${saveSummary.errors > 0 ? "border-warning/30 bg-warning-bg text-warning" : "border-success/30 bg-success-bg text-success"}`}>
              {saveSummary.saved} saved{saveSummary.errors > 0 ? `, ${saveSummary.errors} error(s)` : ""}
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Party</th>
                    <th className="px-3 py-2">Invoice</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Taxable</th>
                    <th className="px-3 py-2 text-right">VAT</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((qi, idx) => {
                    const isEditing = editingId === qi.id;
                    return (
                      <tr
                        key={qi.id}
                        className={`border-b border-border last:border-b-0 ${
                          qi.status === "error" ? "bg-danger/5" : qi.status === "saved" ? "bg-success/5" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-muted">{idx + 1}</td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.miti ?? qi.miti}
                              onChange={(e) => setEditValues((v) => ({ ...v, miti: e.target.value }))}
                              className="h-8 w-24 rounded border border-border bg-surface px-2 text-xs"
                            />
                          ) : (
                            qi.miti
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium">{qi.partyName}</span>
                          {qi.locationName && (
                            <span className="ml-1 text-xs text-muted">· {qi.locationName}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.invoiceNumber ?? qi.invoiceNumber}
                              onChange={(e) => setEditValues((v) => ({ ...v, invoiceNumber: e.target.value }))}
                              className="h-8 w-24 rounded border border-border bg-surface px-2 text-xs"
                            />
                          ) : (
                            qi.invoiceNumber || "–"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select
                              value={editValues.categoryId ?? qi.categoryId}
                              onChange={(e) => setEditValues((v) => ({ ...v, categoryId: e.target.value }))}
                              className="h-8 rounded border border-border bg-surface px-2 text-xs"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          ) : (
                            qi.categoryName
                          )}
                        </td>
                        <td className="px-3 py-2 max-w-48 truncate">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.item ?? qi.item}
                              onChange={(e) => setEditValues((v) => ({ ...v, item: e.target.value }))}
                              className="h-8 w-full rounded border border-border bg-surface px-2 text-xs"
                            />
                          ) : (
                            qi.item
                          )}
                        </td>
                        <td className="tabular-amount px-3 py-2 text-right text-xs">
                          {formatAmount(qi.taxableAmount)}
                        </td>
                        <td className="tabular-amount px-3 py-2 text-right text-xs">
                          {formatAmount(qi.vatAmount)}
                        </td>
                        <td className="tabular-amount px-3 py-2 text-right text-xs font-medium">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editValues.totalAmount ?? qi.totalAmount}
                              onChange={(e) => setEditValues((v) => ({ ...v, totalAmount: e.target.value }))}
                              className="h-8 w-24 rounded border border-border bg-surface px-2 text-xs text-right"
                            />
                          ) : (
                            formatAmount(qi.totalAmount)
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {qi.status === "saved" && <Badge tone="success">Saved</Badge>}
                          {qi.status === "saving" && <Badge tone="default">Saving…</Badge>}
                          {qi.status === "error" && (
                            <Badge tone="danger">{qi.error ?? "Error"}</Badge>
                          )}
                          {qi.status === "pending" && <Badge tone="default">Pending</Badge>}
                          {qi.warnings && qi.warnings.length > 0 && (
                            <p className="mt-1 max-w-48 truncate text-xs text-warning" title={qi.warnings.join("\n")}>
                              {qi.warnings.length} warning(s)
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {qi.status === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              {isEditing ? (
                                <>
                                  <button className="text-xs text-primary hover:underline" onClick={saveEdit}>Save</button>
                                  <button className="text-xs text-muted hover:underline" onClick={() => { setEditingId(null); setEditValues({}); }}>Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button className="text-xs text-primary hover:underline" onClick={() => startEdit(qi)}>Edit</button>
                                  <button className="text-xs text-danger hover:underline" onClick={() => removeFromQueue(qi.id)}>Remove</button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-surface-subtle text-xs font-medium">
                    <td className="px-3 py-2" colSpan={6}>Total</td>
                    <td className="tabular-amount px-3 py-2 text-right">
                      {formatAmount(queue.reduce((s, q) => s + Number(q.taxableAmount), 0))}
                    </td>
                    <td className="tabular-amount px-3 py-2 text-right">
                      {formatAmount(queue.reduce((s, q) => s + Number(q.vatAmount), 0))}
                    </td>
                    <td className="tabular-amount px-3 py-2 text-right">
                      {formatAmount(queue.reduce((s, q) => s + Number(q.totalAmount), 0))}
                    </td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="lg:hidden">
              {queue.map((qi, idx) => {
                const isEditing = editingId === qi.id;
                return (
                  <div
                    key={qi.id}
                    className={`border-b border-border p-4 last:border-b-0 ${
                      qi.status === "error" ? "bg-danger/5" : qi.status === "saved" ? "bg-success/5" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <span className="text-xs text-muted">#{idx + 1}</span>
                        <span className="ml-2 font-medium">{qi.partyName}</span>
                        {qi.locationName && (
                          <span className="ml-1 text-xs text-muted">· {qi.locationName}</span>
                        )}
                      </div>
                      <span className="tabular-amount text-sm font-medium">{formatAmount(qi.totalAmount)}</span>
                    </div>
                    <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span>{qi.miti}</span>
                      {qi.invoiceNumber && <span>Inv: {qi.invoiceNumber}</span>}
                      <span>{qi.categoryName}</span>
                    </div>
                    <p className="mb-2 truncate text-sm text-foreground">{qi.item}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        {qi.status === "saved" && <Badge tone="success">Saved</Badge>}
                        {qi.status === "saving" && <Badge tone="default">Saving…</Badge>}
                        {qi.status === "error" && <Badge tone="danger">{qi.error ?? "Error"}</Badge>}
                        {qi.status === "pending" && <Badge tone="default">Pending</Badge>}
                      </div>
                      {qi.status === "pending" && (
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <button className="text-xs text-primary hover:underline" onClick={saveEdit}>Save</button>
                              <button className="text-xs text-muted hover:underline" onClick={() => { setEditingId(null); setEditValues({}); }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="text-xs text-primary hover:underline" onClick={() => startEdit(qi)}>Edit</button>
                              <button className="text-xs text-danger hover:underline" onClick={() => removeFromQueue(qi.id)}>Remove</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Mobile totals */}
              {queue.length > 0 && (
                <div className="flex items-center justify-between bg-surface-subtle px-4 py-3 text-xs font-medium">
                  <span>Total ({queue.length} items)</span>
                  <span className="tabular-amount">{formatAmount(queue.reduce((s, q) => s + Number(q.totalAmount), 0))}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
