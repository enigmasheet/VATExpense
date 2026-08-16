"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { VAT_RATE_DEFAULT } from "@/lib/constants";

interface CompanyData {
  id: string;
  name: string;
  vatNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  defaultVatRate: string;
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface Props {
  open: boolean;
  company: CompanyData | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CompanyEditModal({ open, company, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [defaultVatRate, setDefaultVatRate] = useState(VAT_RATE_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setVatNumber(company.vatNumber ?? "");
      setAddress(company.address ?? "");
      setPhone(company.phone ?? "");
      setEmail(company.email ?? "");
      setDefaultVatRate(company.defaultVatRate);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state from prop is intentional
  }, [company]);

  if (!open || !company) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/admin/companies/${company!.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          vatNumber: vatNumber || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
          defaultVatRate,
        }),
      });
      toast("Company updated", "success");
      onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to update company", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-semibold mb-4">Edit Company</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Field label="Company name" htmlFor="ce-name">
            <Input id="ce-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="VAT number" htmlFor="ce-vat">
            <Input id="ce-vat" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Address" htmlFor="ce-address">
              <Input id="ce-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label="Phone" htmlFor="ce-phone">
              <Input id="ce-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" htmlFor="ce-email">
              <Input id="ce-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Default VAT rate (%)" htmlFor="ce-vatrate">
              <Input id="ce-vatrate" type="number" step="0.01" value={defaultVatRate} onChange={(e) => setDefaultVatRate(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
