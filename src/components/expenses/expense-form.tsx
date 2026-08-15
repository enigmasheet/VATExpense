"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { round2 } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PartyFormModal } from "@/components/party-form-modal";
import { useToast } from "@/components/ui/toast";

import { VAT_RATE, VAT_RATE_DEFAULT } from "@/lib/constants";
import { calcFromTaxable as calcVatFromTaxable, calcFromTotal as calcVatFromTotal } from "@/lib/expenses/ledger-calculation";
import { MessageList, type Message } from "@/components/ui/alert";

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
  miti: "",
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

  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [trucks, setTrucks] = useState<{ id: string; name: string; ownerName: string | null }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [partyModalOpen, setPartyModalOpen] = useState(false);

  function refreshParties() {
    if (!companyId) return;
    api<{ data: { id: string; name: string }[] }>(`/api/parties?companyId=${companyId}`)
      .then(({ data }) => setParties(data))
      .catch(() => toast("Failed to refresh parties", "error"));
  }

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      api<{ data: { id: string; name: string }[] }>(`/api/parties?companyId=${companyId}`)
        .then(({ data }) => setParties(data))
        .catch((e) => console.error("Failed to load parties:", e)),
      api<{ data: { id: string; name: string }[] }>(`/api/categories?companyId=${companyId}`)
        .then(({ data }) => setCategories(data))
        .catch((e) => console.error("Failed to load categories:", e)),
      api<{ data: { id: string; name: string }[] }>(`/api/locations?companyId=${companyId}`)
        .then(({ data }) => setLocations(data))
        .catch((e) => console.error("Failed to load locations:", e)),
      api<{ data: { id: string; name: string; ownerName: string | null }[] }>(`/api/trucks?companyId=${companyId}`)
        .then(({ data }) => setTrucks(data))
        .catch((e) => console.error("Failed to load trucks:", e)),
    ]).finally(() => setLoadingOptions(false));
  }, [companyId]);

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
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const msgs: Message[] = [];
        if (err.status === 409) {
          msgs.push({ kind: "danger", text: err.detail });
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
          <p className="text-xs text-muted">Loading parties, categories, and locations...</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Miti (BS)" htmlFor="e-miti">
            <Input
              id="e-miti"
              required
              placeholder="2082-04-05 or 04/05/2082"
              value={values.miti}
              onChange={set("miti")}
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
            <div className="flex gap-2">
              <Select id="e-party" required value={values.partyId} onChange={set("partyId")} className="flex-1">
                <option value="">Select party</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPartyModalOpen(true)}>
                Add
              </Button>
            </div>
          </Field>
          <Field label="Category" htmlFor="e-category">
            <Select id="e-category" required value={values.categoryId} onChange={set("categoryId")}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location" htmlFor="e-location">
            <Select id="e-location" value={values.locationId} onChange={set("locationId")}>
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
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
          <Field label="Item / description" htmlFor="e-item">
            <Input
              id="e-item"
              required
              placeholder="What was purchased?"
              value={values.item}
              onChange={set("item")}
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

        {/* Qty & Rate row */}
        <div className="grid grid-cols-2 gap-4">
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
        <Button type="submit" disabled={submitting || !companyId}>
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
    </form>
  );
}
