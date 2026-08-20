"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ROLE_ADMIN, VAT_RATE_DEFAULT } from "@/lib/constants";
import { SlideOver } from "@/components/ui/slide-over";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Slide-over panel that provisions a new company with its first admin user
 * and an auto-derived active fiscal year.
 */
export function ProvisionPanel({ open, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setCompanyName("");
    setVatNumber("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
  }

  function handleClose() {
    console.log("[ProvisionPanel] handleClose called, saving:", saving);
    if (saving) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("[ProvisionPanel] handleSubmit called");
    setSaving(true);
    try {
      const result = await api<{ data: { companyId: string; fiscalYearName: string } }>("/api/admin/companies", {
        method: "POST",
        body: JSON.stringify({
          company: { name: companyName.trim(), vatNumber: vatNumber.trim() || null, defaultVatRate: VAT_RATE_DEFAULT },
          user: { name: adminName.trim(), email: adminEmail.trim(), password: adminPassword, role: ROLE_ADMIN },
        }),
      });
      toast(`Created company with fiscal year ${result.data.fiscalYearName}`, "success");
      reset();
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Provisioning failed", "error");
      setAdminPassword("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      title="Provision new company"
      description="Creates a company, its first admin user, and an active fiscal year from today's Nepali date."
      onClose={handleClose}
      closeOnEscape={!saving}
      closeOnOverlayClick={!saving}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="provision-form" loading={saving}>
            {saving ? "Creating..." : "Create company"}
          </Button>
        </>
      }
    >
      <form id="provision-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="rounded-lg border border-border/60 bg-surface-muted p-4">
          <p className="text-sm font-medium text-foreground">Company</p>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Company name" htmlFor="pv-name">
              <Input id="pv-name" required placeholder="e.g. ABC Traders" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </Field>
            <Field label="VAT number (optional)" htmlFor="pv-vat">
              <Input id="pv-vat" placeholder="e.g. 301234567" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-surface-muted p-4">
          <p className="text-sm font-medium text-foreground">Initial admin</p>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Admin name" htmlFor="pv-admin-name">
              <Input id="pv-admin-name" required placeholder="e.g. Ram Sharma" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </Field>
            <Field label="Admin email" htmlFor="pv-admin-email">
              <Input id="pv-admin-email" type="email" required placeholder="admin@example.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="pv-admin-password" hint="Min 8 characters">
              <Input
                id="pv-admin-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </form>
    </SlideOver>
  );
}