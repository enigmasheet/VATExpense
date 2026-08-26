"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { useCategories, useItemCategories, useParties, useTrucks } from "@/lib/hooks/use-reference-data";
import { round2 } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PartyFormModal } from "@/components/party-form-modal";
import { useToast } from "@/components/ui/toast";

import { VAT_RATE, VAT_RATE_DEFAULT } from "@/lib/constants";
import { calcFromTaxable as calcVatFromTaxable, calcFromTotal as calcVatFromTotal } from "@/lib/expenses/ledger-calculation";
import { formatMitiInput, todayMiti } from "@/lib/expenses/ledger-utils";
import { MessageList, type Message } from "@/components/ui/alert";
import type { Party } from "@/lib/expenses/ledger-types";
import { queryKeys } from "@/lib/query-keys";

interface FormValues {
  miti: string;
  invoiceNumber: string;
  partyId: string;
  categoryId: string;
  locationId: string;
  truckId: string;
  item: string;
  quantity: string;
  rate: string;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  remarks: string;
}

export interface ExpenseInitial {
  miti: string;
  invoiceNumber: string | null;
  partyId: string;
  categoryId: string;
  locationId: string | null;
  truckId: string | null;
  item: string;
  quantity: string | null;
  rate: string | null;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatRate: string;
  remarks: string | null;
}

interface ItemMapping {
  id: string;
  itemName: string;
  categoryId: string;
  categoryName: string | null;
}

const emptyForm: FormValues = {
  miti: todayMiti(),
  invoiceNumber: "",
  partyId: "",
  categoryId: "",
  locationId: "",
  truckId: "",
  item: "",
  quantity: "",
  rate: "",
  taxableAmount: "",
  vatAmount: "",
  totalAmount: "",
  remarks: "",
};

/**
 * Renders a form for creating or editing an expense, including VAT and total calculations.
 *
 * @param mode - Whether the form creates a new expense or edits an existing one.
 * @param expenseId - Identifier of the expense being edited.
 * @param initial - Existing expense values used to initialize edit mode.
 * @param initialRowVersion - Version used to detect conflicting edits.
 */
export function ExpenseForm({
  mode,
  expenseId,
  initial,
  initialRowVersion,
}: {
  mode: "create" | "edit";
  expenseId?: string;
  initial?: ExpenseInitial | null;
  initialRowVersion?: number;
}) {
  const router = useRouter();
  const { companyId, fiscalYearId, fiscalYears, companies } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const defaultVatRate = companies[0]?.defaultVatRate ?? VAT_RATE_DEFAULT;
  const [values, setValues] = useState<FormValues>(() =>
    mode === "edit" && initial
      ? {
          miti: initial.miti,
          invoiceNumber: initial.invoiceNumber ?? "",
          partyId: initial.partyId,
          categoryId: initial.categoryId,
          locationId: initial.locationId ?? "",
          truckId: initial.truckId ?? "",
          item: initial.item,
          quantity: initial.quantity ?? "",
          rate: initial.rate ?? "",
          taxableAmount: initial.taxableAmount,
          vatAmount: initial.vatAmount,
          totalAmount: initial.totalAmount,
          remarks: initial.remarks ?? "",
        }
      : emptyForm,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isDirty = useRef(false);

  // Mark form as dirty when values change
  useEffect(() => {
    isDirty.current = true;
  }, [values]);

  // Clear dirty flag after successful submit
  useEffect(() => {
    if (messages.some((m) => m.kind === "success")) {
      isDirty.current = false;
    }
  }, [messages]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Ctrl+Enter keyboard shortcut to submit
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const form = document.querySelector("form");
        if (form) form.requestSubmit();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // React Query hooks for reference data
  const { data: parties = [], isLoading: partiesLoading } = useParties(companyId ?? "");
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(companyId ?? "");
  const { data: itemMappings = [], isLoading: itemMappingsLoading } = useItemCategories(companyId ?? "");
  const { data: trucks = [], isLoading: trucksLoading } = useTrucks(companyId ?? "");

  const loadingOptions = partiesLoading || categoriesLoading || itemMappingsLoading || trucksLoading;

  // Rest of the component state...
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [partyResolved, setPartyResolved] = useState(false);
  const [partyResults, setPartyResults] = useState<Party[]>([]);
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyHighlightIdx, setPartyHighlightIdx] = useState(-1);
  const partyInputRef = useRef<HTMLInputElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const [partyDropdownPos, setPartyDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Item autocomplete (backed by item_categories links)
  const initialItem = mode === "edit" && initial ? initial.item : "";
  const [itemSearch, setItemSearch] = useState(initialItem);
  const [itemResolved, setItemResolved] = useState(mode === "edit" && !!initial?.item);
  const [itemResults, setItemResults] = useState<ItemMapping[]>([]);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemHighlightIdx, setItemHighlightIdx] = useState(-1);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const [itemDropdownPos, setItemDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // New item-link modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkCategoryId, setLinkCategoryId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [savingLink, setSavingLink] = useState(false);

  const updatePartyDropdownPos = useCallback(() => {
    const rect = partyInputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const width = Math.min(rect.width, vw - 16);
    const left = Math.min(Math.max(rect.left, 8), vw - width - 8);
    setPartyDropdownPos({ top: rect.bottom + 4, left, width });
  }, []);

  function refreshParties() {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.parties(companyId) });
  }

  function searchParties(q: string) {
    if (q.length < 1) {
      setPartyResults([]);
      setPartyOpen(false);
      return;
    }
    const lower = q.toLowerCase();
    const isVat = /\d{5,}/.test(q);
    const matched = isVat
      ? parties.filter((p) => p.vatNumber?.includes(q))
      : parties.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            (p.vatNumber && p.vatNumber.includes(q)),
        );
    setPartyResults(matched.slice(0, 8));
    setPartyOpen(matched.length > 0);
    setPartyHighlightIdx(-1);
  }

  function selectParty(party: Party) {
    setPartySearch(party.name);
    setPartyResolved(true);
    setPartyOpen(false);
    setValues((v) => ({ ...v, partyId: party.id, locationId: party.locationId ?? "" }));
  }

  function searchItems(q: string) {
    if (q.length < 1) {
      setItemResults([]);
      setItemOpen(false);
      return;
    }
    const lower = q.toLowerCase();
    const matched = itemMappings.filter((m) => m.itemName.toLowerCase().includes(lower));
    setItemResults(matched.slice(0, 8));
    setItemOpen(matched.length > 0);
    setItemHighlightIdx(-1);
  }

  function selectItemMapping(mapping: ItemMapping) {
    setItemSearch(mapping.itemName);
    setItemResolved(true);
    setItemOpen(false);
    setValues((v) => ({ ...v, item: mapping.itemName, categoryId: mapping.categoryId }));
  }

  // Click outside to close party dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setPartyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reposition the portal dropdown while open (form scrolls on mobile)
  useEffect(() => {
    if (!partyOpen) return;
    updatePartyDropdownPos();
    window.addEventListener("resize", updatePartyDropdownPos);
    window.addEventListener("scroll", updatePartyDropdownPos, true);
    return () => {
      window.removeEventListener("resize", updatePartyDropdownPos);
      window.removeEventListener("scroll", updatePartyDropdownPos, true);
    };
  }, [partyOpen, updatePartyDropdownPos]);

  const updateItemDropdownPos = useCallback(() => {
    const rect = itemInputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const width = Math.min(rect.width, vw - 16);
    const left = Math.min(Math.max(rect.left, 8), vw - width - 8);
    setItemDropdownPos({ top: rect.bottom + 4, left, width });
  }, []);

  // Click outside to close item dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
        setItemOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reposition item dropdown while open
  useEffect(() => {
    if (!itemOpen) return;
    updateItemDropdownPos();
    window.addEventListener("resize", updateItemDropdownPos);
    window.addEventListener("scroll", updateItemDropdownPos, true);
    return () => {
      window.removeEventListener("resize", updateItemDropdownPos);
      window.removeEventListener("scroll", updateItemDropdownPos, true);
    };
  }, [itemOpen, updateItemDropdownPos]);

  // Initialize partySearch from initial values (edit mode) once parties load.
  // Guarded conditional state update during render (React-recommended pattern)
  // so it stops as soon as partyResolved flips.
  if (mode === "edit" && initial?.partyId && !partyResolved && parties.length > 0) {
    const found = parties.find((p) => p.id === initial.partyId);
    if (found) {
      setPartySearch(found.name);
      setPartyResolved(true);
    }
  }

  const set = useCallback(
    (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value })),
    [],
  );

  function calcFromTaxable(taxableStr: string) {
    const taxable = Number(taxableStr);
    if (!Number.isFinite(taxable) || taxable <= 0) return;
    const { vat, total } = calcVatFromTaxable(taxable);
    setValues((v) => ({
      ...v,
      taxableAmount: taxableStr,
      vatAmount: String(vat),
      totalAmount: String(total),
    }));
  }

  function calcFromTotal(totalStr: string) {
    const total = Number(totalStr);
    if (!Number.isFinite(total) || total <= 0) return;
    const { taxable, vat } = calcVatFromTotal(total);
    setValues((v) => ({
      ...v,
      taxableAmount: String(taxable),
      vatAmount: String(vat),
      totalAmount: totalStr,
    }));
  }

  function calcFromQtyRate() {
    const qty = Number(values.quantity);
    const rate = Number(values.rate);
    if (!Number.isFinite(qty) || !Number.isFinite(rate)) return;
    const taxable = round2(qty * rate);
    const vat = round2((taxable * VAT_RATE) / 100);
    const total = round2(taxable + vat);
    setValues((v) => ({
      ...v,
      taxableAmount: String(taxable),
      vatAmount: String(vat),
      totalAmount: String(total),
    }));
  }

  function onTaxableChange(e: React.ChangeEvent<HTMLInputElement>) {
    calcFromTaxable(e.target.value);
  }

  function onTotalChange(e: React.ChangeEvent<HTMLInputElement>) {
    calcFromTotal(e.target.value);
  }

  async function saveItemLink() {
    if (!companyId || !linkName.trim() || !linkCategoryId) return;
    setSavingLink(true);
    setLinkError(null);
    try {
      await api("/api/item-categories", {
        method: "POST",
        body: JSON.stringify({ itemName: linkName.trim(), categoryId: linkCategoryId }),
      });
      toast("Item linked to category.");
      setLinkModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.itemCategories(companyId) });
      // Find the created item mapping from the refreshed data
      setTimeout(() => {
        const created = itemMappings.find(
          (m) => m.itemName.toLowerCase() === linkName.trim().toLowerCase(),
        );
        if (created) {
          setItemSearch(created.itemName);
          setItemResolved(true);
          setValues((v) => ({ ...v, item: created.itemName, categoryId: created.categoryId }));
        }
      }, 100);
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.detail : "Failed to save item link");
    } finally {
      setSavingLink(false);
    }
  }

  async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setMessages([]);

    const payload = {
      companyId,
      fiscalYearId,
      miti: values.miti,
      invoiceNumber: values.invoiceNumber || null,
      partyId: values.partyId,
      categoryId: values.categoryId,
      locationId: values.locationId || null,
      truckId: values.truckId || null,
      item: values.item,
      quantity: values.quantity || null,
      rate: values.rate || null,
      taxableAmount: values.taxableAmount,
      vatAmount: values.vatAmount,
      totalAmount: values.totalAmount,
      vatRate: defaultVatRate,
      remarks: values.remarks || null,
    };

    try {
      if (mode === "create") {
        const res = await api<{ data: unknown; warnings?: string[] }>("/api/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.warnings && res.warnings.length > 0) {
          setMessages(res.warnings.map((text) => ({ kind: "warning" as const, text })));
        } else {
          setMessages([{ kind: "success", text: "Expense recorded." }]);
        }
        setValues(emptyForm);
        setPartySearch("");
        setPartyResolved(false);
        setItemSearch("");
        setItemResolved(false);
        isDirty.current = false;
      } else {
        const res = await api<{ data: unknown; warnings?: string[] }>(`/api/expenses/${expenseId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, rowVersion: initialRowVersion }),
        });
        const msgs: Message[] = [];
        if (res.warnings && res.warnings.length > 0) {
          res.warnings.forEach((text) => msgs.push({ kind: "warning", text }));
        }
        msgs.push({ kind: "success", text: "Expense updated." });
        setMessages(msgs);
        isDirty.current = false;
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const msgs: Message[] = [];
        if (err.status === 409) {
          msgs.push({ kind: "danger", text: err.detail });
          toast(err.detail, "error");
        } else if (err.status === 422 && err.body?.errors) {
          (err.body.errors as string[]).forEach((text) => msgs.push({ kind: "danger", text }));
        } else {
          msgs.push({ kind: "danger", text: err.detail });
        }
        setMessages(msgs);
      } else {
        setMessages([{ kind: "danger", text: "Failed to save expense." }]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const needsFiscalYear = fiscalYears.length === 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {needsFiscalYear && (
        <MessageList
          messages={[
            { kind: "info", text: "Create a fiscal year first — expenses are filed under one." },
          ]}
        />
      )}
      <MessageList messages={messages} />

      {/* Invoice Details */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">Invoice details</h2>
        {loadingOptions && (
          <p className="text-xs text-muted">Loading parties and items...</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Miti (BS)" htmlFor="e-miti">
            <Input
              id="e-miti"
              required
              placeholder="2083-04-15"
              value={values.miti}
              onChange={(e) => setValues((v) => ({ ...v, miti: formatMitiInput(e.target.value) }))}
            />
          </Field>
          <Field label="Invoice number" htmlFor="e-invoice" hint="Leave blank for cash memos">
            <Input
              id="e-invoice"
              placeholder="HH-001"
              value={values.invoiceNumber}
              onChange={set("invoiceNumber")}
            />
          </Field>
          <Field label="Party / supplier" htmlFor="e-party">
            <div className="flex gap-2" ref={partyDropdownRef}>
              <div className="relative flex-1">
                <input
                  ref={partyInputRef}
                  id="e-party"
                  type="text"
                  required
                  value={partySearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPartySearch(val);
                    setPartyResolved(false);
                    setValues((v) => ({ ...v, partyId: "" }));
                    searchParties(val);
                  }}
                  onFocus={() => {
                    updatePartyDropdownPos();
                    if (partyResults.length > 0) setPartyOpen(true);
                    else if (partySearch.length > 0) {
                      searchParties(partySearch);
                      setPartyOpen(partyResults.length > 0);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!partyOpen) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setPartyHighlightIdx((i) => Math.min(i + 1, partyResults.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setPartyHighlightIdx((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter" && partyHighlightIdx >= 0) {
                      e.preventDefault();
                      e.stopPropagation();
                      selectParty(partyResults[partyHighlightIdx]);
                    } else if (e.key === "Escape") {
                      setPartyOpen(false);
                    } else if (e.key === "Tab") {
                      setPartyOpen(false);
                    }
                  }}
                  placeholder="Search party by name or VAT number..."
                  className={`h-10 w-full rounded border bg-transparent px-3 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                    !partyResolved && partySearch
                      ? "border-danger/40 bg-danger/5"
                      : "border-border/50"
                  }`}
                />
                {partyResolved && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                )}
                {partyOpen && partyResults.length > 0 && createPortal(
                  <div
                    role="listbox"
                    className="fixed max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-surface py-1 shadow-lg z-50"
                    style={partyDropdownPos ? {
                      top: partyDropdownPos.top,
                      left: partyDropdownPos.left,
                      width: partyDropdownPos.width,
                    } : { top: 0, left: 0, width: 0 }}
                  >
                    {partyResults.map((party, idx) => (
                      <button
                        key={party.id}
                        type="button"
                        role="option"
                        aria-selected={party.id === values.partyId}
                        className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-surface-hover ${
                          idx === partyHighlightIdx ? "bg-surface-hover" : ""
                        } ${party.id === values.partyId ? "font-medium text-primary" : "text-foreground"}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectParty(party);
                        }}
                      >
                        <span className="font-medium">{party.name}</span>
                        {party.vatNumber && (
                          <span className="ml-2 text-muted">VAT: {party.vatNumber}</span>
                        )}
                      </button>
                    ))}
                  </div>,
                  document.body,
                )}
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPartyModalOpen(true)}>
                Add
              </Button>
            </div>
          </Field>
          <Field label="Truck" htmlFor="e-truck" hint="Optional — for fuel/maintenance tracking">
            <Select id="e-truck" value={values.truckId} onChange={set("truckId")}>
              <option value="">—</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.ownerName ? ` — ${t.ownerName}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Item" htmlFor="e-item" hint="Category is picked automatically from item links">
            <div className="flex gap-2" ref={itemDropdownRef}>
              <div className="relative flex-1">
                <input
                  ref={itemInputRef}
                  id="e-item"
                  type="text"
                  required
                  value={itemSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemSearch(val);
                    setItemResolved(false);
                    setValues((v) => ({ ...v, item: val }));
                    searchItems(val);
                  }}
                  onFocus={() => {
                    updateItemDropdownPos();
                    if (itemResults.length > 0) setItemOpen(true);
                    else if (itemSearch.length > 0) {
                      searchItems(itemSearch);
                      setItemOpen(itemResults.length > 0);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!itemOpen) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setItemHighlightIdx((i) => Math.min(i + 1, itemResults.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setItemHighlightIdx((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter" && itemHighlightIdx >= 0) {
                      e.preventDefault();
                      e.stopPropagation();
                      selectItemMapping(itemResults[itemHighlightIdx]);
                    } else if (e.key === "Escape") {
                      setItemOpen(false);
                    } else if (e.key === "Tab") {
                      setItemOpen(false);
                    }
                  }}
                  placeholder="Type item name..."
                  className={`h-10 w-full rounded border bg-transparent px-3 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                    !itemResolved && itemSearch
                      ? "border-danger/40 bg-danger/5"
                      : "border-border/50"
                  }`}
                />
                {itemResolved && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                )}
                {itemOpen && itemResults.length > 0 && createPortal(
                  <div
                    role="listbox"
                    className="fixed max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-surface py-1 shadow-lg z-50"
                    style={itemDropdownPos ? {
                      top: itemDropdownPos.top,
                      left: itemDropdownPos.left,
                      width: itemDropdownPos.width,
                    } : { top: 0, left: 0, width: 0 }}
                  >
                    {itemResults.map((mapping, idx) => (
                      <button
                        key={mapping.id}
                        type="button"
                        role="option"
                        aria-selected={mapping.itemName === itemSearch && itemResolved}
                        className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-surface-hover ${
                          idx === itemHighlightIdx ? "bg-surface-hover" : ""
                        } ${mapping.itemName === itemSearch && itemResolved ? "font-medium text-primary" : "text-foreground"}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectItemMapping(mapping);
                        }}
                      >
                        <span className="font-medium">{mapping.itemName}</span>
                        {mapping.categoryName && (
                          <span className="ml-2 text-muted">{mapping.categoryName}</span>
                        )}
                      </button>
                    ))}
                  </div>,
                  document.body,
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLinkName(itemSearch);
                  setLinkError(null);
                  setLinkModalOpen(true);
                }}
              >
                Link
              </Button>
            </div>
          </Field>
        </div>
      </section>

      {/* Amounts - VAT Calculator */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">Amounts</h2>
        <p className="text-xs text-muted">
          VAT rate: {VAT_RATE}% (Nepal government rate). Enter either the taxable amount or the total — the other fields calculate automatically.
        </p>

        {/* Qty & Rate row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Quantity" htmlFor="e-qty">
            <Input id="e-qty" inputMode="decimal" value={values.quantity} onChange={set("quantity")} />
          </Field>
          <Field label="Rate" htmlFor="e-rate">
            <Input id="e-rate" inputMode="decimal" value={values.rate} onChange={set("rate")} />
          </Field>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={calcFromQtyRate} className="w-fit">
          Calculate from Qty × Rate
        </Button>

        {/* Main amounts */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Taxable amount (Rs.)" htmlFor="e-taxable" hint="Enter this OR total below">
            <Input
              id="e-taxable"
              required
              inputMode="decimal"
              value={values.taxableAmount}
              onChange={onTaxableChange}
            />
          </Field>
          <Field label="VAT @ 13% (Rs.)" htmlFor="e-vat">
            <Input
              id="e-vat"
              required
              inputMode="decimal"
              value={values.vatAmount}
              readOnly
              className="bg-surface-muted"
            />
          </Field>
          <Field label="Total amount (Rs.)" htmlFor="e-total" hint="Enter this OR taxable above">
            <Input
              id="e-total"
              required
              inputMode="decimal"
              value={values.totalAmount}
              onChange={onTotalChange}
            />
          </Field>
        </div>

        <Field label="Remarks" htmlFor="e-remarks">
          <Input id="e-remarks" value={values.remarks} onChange={set("remarks")} />
        </Field>
      </section>

      <div className="flex gap-2">
        <Button type="submit" loading={submitting} disabled={!companyId}>
          {submitting ? "Saving…" : mode === "create" ? "Record expense" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <PartyFormModal
        open={partyModalOpen}
        mode="create"
        onSaved={() => {
          setPartyModalOpen(false);
          refreshParties();
        }}
        onCancel={() => setPartyModalOpen(false)}
      />

      <Modal
        open={linkModalOpen}
        title="Link item to category"
        description="New items are saved as links so their category is picked automatically next time."
        onClose={() => {
          if (savingLink) return;
          setLinkModalOpen(false);
        }}
        closeOnEscape={!savingLink}
        closeOnOverlayClick={!savingLink}
      >
        <form
          id="item-link-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveItemLink();
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Item name" htmlFor="link-item-name" hint="As typed on the invoice, e.g. Diesel">
            <Input
              id="link-item-name"
              required
              placeholder="e.g. Diesel"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
            />
          </Field>
          <Field label="Category" htmlFor="link-category-id">
            <Select
              id="link-category-id"
              required
              value={linkCategoryId}
              onChange={(e) => setLinkCategoryId(e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {linkError && <MessageList messages={[{ kind: "danger", text: linkError }]} />}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLinkModalOpen(false)}
              disabled={savingLink}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={savingLink} disabled={!companyId}>
              {savingLink ? "Saving..." : "Save link"}
            </Button>
          </div>
        </form>
      </Modal>
    </form>
  );
}
