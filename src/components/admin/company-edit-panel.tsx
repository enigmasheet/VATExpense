"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { VAT_RATE_DEFAULT } from "@/lib/constants";
import { SlideOver } from "@/components/admin/slide-over";

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

/**
 * Slide-over panel for editing company details.
 */
export function CompanyEditPanel({ open, company, onClose, onSaved }: Props) {
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state from prop is intentional
      setName(company.name);
      setVatNumber(company.vatNumber ?? "");
      setAddress(company.address ?? "");
      setPhone(company.phone ?? "");
      setEmail(company.email ?? "");
      setDefaultVatRate(company.defaultVatRate);
    }
  }, [company]);

  async function handleSubmit(e: React.FormEvent) {
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
      onClose();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to update company", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      title="Edit Company"
      description={company?.name}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="company-edit-form" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="company-edit-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Company name" htmlFor="ce-name">
          <Input id="ce-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="VAT number" htmlFor="ce-vat">
            <Input id="ce-vat" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
          </Field>
          <Field label="Default VAT rate (%)" htmlFor="ce-vatrate">
            <Input id="ce-vatrate" type="number" step="0.01" value={defaultVatRate} onChange={(e) => setDefaultVatRate(e.target.value)} />
          </Field>
        </div>
        <Field label="Address" htmlFor="ce-address">
          <Input id="ce-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" htmlFor="ce-phone">
            <Input id="ce-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="ce-email">
            <Input id="ce-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
      </form>
    </SlideOver>
  );
}