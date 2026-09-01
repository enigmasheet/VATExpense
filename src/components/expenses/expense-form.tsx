"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { useCategories, useItemCategories, useParties, useTrucks } from "@/lib/hooks/use-reference-data";
import { round2 } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { MitiDateInput } from "@/components/ui/miti-date-input";
import { PartyFormModal } from "@/components/party-form-modal";
import { useToast } from "@/components/ui/toast";
import { VAT_RATE, VAT_RATE_DEFAULT } from "@/lib/constants";
import { calcFromTaxable as calcVatFromTaxable, calcFromTotal as calcVatFromTotal } from "@/lib/expenses/ledger-calculation";
import { todayMiti } from "@/lib/expenses/ledger-utils";
import { normalizeMiti } from "@/lib/nepali-date";
import { MessageList, type Message } from "@/components/ui/alert";
import { queryKeys } from "@/lib/query-keys";
import { ExpensePartyAutocomplete } from "./expense-party-autocomplete";
import { ItemAutocomplete } from "./item-autocomplete";
import { ItemLinkModal } from "./item-link-modal";

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
          miti: normalizeMiti(initial.miti),
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

  useEffect(() => {
    isDirty.current = true;
  }, [values]);

  useEffect(() => {
    if (messages.some((m) => m.kind === "success")) {
      isDirty.current = false;
    }
  }, [messages]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

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

  const { data: parties = [], isLoading: partiesLoading } = useParties(companyId ?? "");
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(companyId ?? "");
  const { data: itemMappings = [], isLoading: itemMappingsLoading } = useItemCategories(companyId ?? "");
  const { data: trucks = [], isLoading: trucksLoading } = useTrucks(companyId ?? "");

  const loadingOptions = partiesLoading || categoriesLoading || itemMappingsLoading || trucksLoading;

  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [partyResolved, setPartyResolved] = useState(false);

  const initialItem = mode === "edit" && initial ? initial.item : "";
  const [itemSearch, setItemSearch] = useState(initialItem);
  const [itemResolved, setItemResolved] = useState(mode === "edit" && !!initial?.item);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkItemName, setLinkItemName] = useState("");

  function refreshParties() {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.parties(companyId) });
  }

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
            <MitiDateInput
              id="e-miti"
              required
              value={values.miti}
              onChange={(v) => setValues((prev) => ({ ...prev, miti: v }))}
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
            <ExpensePartyAutocomplete
              parties={parties}
              value={values.partyId}
              searchValue={partySearch}
              resolved={partyResolved}
              onChange={(partyId, locationId) => setValues((v) => ({ ...v, partyId, locationId: locationId ?? "" }))}
              onSearchChange={setPartySearch}
              onResolvedChange={setPartyResolved}
              onAddNew={() => setPartyModalOpen(true)}
            />
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
            <ItemAutocomplete
              itemMappings={itemMappings}
              value={itemSearch}
              resolved={itemResolved}
              onChange={(itemName, categoryId) => setValues((v) => ({ ...v, item: itemName, categoryId: categoryId ?? v.categoryId }))}
              onSearchChange={setItemSearch}
              onResolvedChange={setItemResolved}
              onLinkNew={() => {
                setLinkItemName(itemSearch);
                setLinkModalOpen(true);
              }}
            />
          </Field>
        </div>
      </section>

      {/* Amounts - VAT Calculator */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">Amounts</h2>
        <p className="text-xs text-muted">
          VAT rate: {VAT_RATE}% (Nepal government rate). Enter either the taxable amount or the total — the other fields calculate automatically.
        </p>

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

      <ItemLinkModal
        open={linkModalOpen}
        itemName={linkItemName}
        categories={categories}
        companyId={companyId ?? ""}
        onSaved={(itemName, categoryId) => {
          setLinkModalOpen(false);
          setItemSearch(itemName);
          setItemResolved(true);
          setValues((v) => ({ ...v, item: itemName, categoryId }));
        }}
        onClose={() => setLinkModalOpen(false)}
      />
    </form>
  );
}
