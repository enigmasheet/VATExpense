"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/use-app";
import { round2 } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

const VAT_RATE = 13;
const VAT_FACTOR = 1 + VAT_RATE / 100; // 1.13

interface FormValues {
  miti: string;
  invoiceNumber: string;
  partyId: string;
  categoryId: string;
  locationId: string;
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
  item: "",
  quantity: "",
  rate: "",
  taxableAmount: "",
  vatAmount: "",
  totalAmount: "",
  remarks: "",
};

type Message =
  | { kind: "success"; text: string }
  | { kind: "warning"; text: string }
  | { kind: "danger"; text: string }
  | { kind: "info"; text: string };

function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) return null;
  const tone = messages[0].kind;
  const toneClass =
    tone === "danger"
      ? "border-danger/30 bg-danger-bg text-danger"
      : tone === "warning"
        ? "border-warning/30 bg-warning-bg text-warning"
        : tone === "success"
          ? "border-success/30 bg-success-bg text-success"
          : "border-border bg-surface text-muted";
  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-4 text-sm ${toneClass}`}>
      {messages.map((m, i) => (
        <span key={i}>{m.text}</span>
      ))}
    </div>
  );
}

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
  const { companyId, fiscalYearId, fiscalYears } = useApp();
  const [values, setValues] = useState<FormValues>(() =>
    mode === "edit" && initial
      ? {
          miti: initial.miti,
          invoiceNumber: initial.invoiceNumber ?? "",
          partyId: initial.partyId,
          categoryId: initial.categoryId,
          locationId: initial.locationId ?? "",
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

  useEffect(() => {
    if (!companyId) return;
    api<{ data: { id: string; name: string }[] }>(`/api/parties?companyId=${companyId}`).then(
      ({ data }) => setParties(data),
    );
    api<{ data: { id: string; name: string }[] }>(`/api/categories?companyId=${companyId}`).then(
      ({ data }) => setCategories(data),
    );
    api<{ data: { id: string; name: string }[] }>(`/api/locations?companyId=${companyId}`).then(
      ({ data }) => setLocations(data),
    );
  }, [companyId]);

  const set = useCallback(
    (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value })),
    [],
  );

  function calcFromTaxable(taxableStr: string) {
    const taxable = Number(taxableStr);
    if (!Number.isFinite(taxable) || taxable <= 0) return;
    const vat = round2((taxable * VAT_RATE) / 100);
    const total = round2(taxable + vat);
    setValues((v) => ({
      ...v,
      vatAmount: String(vat),
      totalAmount: String(total),
    }));
  }

  function calcFromTotal(totalStr: string) {
    const total = Number(totalStr);
    if (!Number.isFinite(total) || total <= 0) return;
    const taxable = round2(total / VAT_FACTOR);
    const vat = round2(total - taxable);
    setValues((v) => ({
      ...v,
      taxableAmount: String(taxable),
      vatAmount: String(vat),
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
    const val = e.target.value;
    setValues((v) => ({ ...v, taxableAmount: val }));
    calcFromTaxable(val);
  }

  function onTotalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setValues((v) => ({ ...v, totalAmount: val }));
    calcFromTotal(val);
  }

  async function onSubmit(e: React.FormEvent) {
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
      item: values.item,
      quantity: values.quantity || null,
      rate: values.rate || null,
      taxableAmount: values.taxableAmount,
      vatAmount: values.vatAmount,
      totalAmount: values.totalAmount,
      vatRate: "13.00",
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
            <Select id="e-party" required value={values.partyId} onChange={set("partyId")}>
              <option value="">Select party</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
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
              className="bg-[#f3f2ec]"
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
    </form>
  );
}
