"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ROLE_ADMIN, ROLE_DATA_ENTRY } from "@/lib/constants";

interface CompanyOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  companies: CompanyOption[];
  onClose: () => void;
  onSaved: () => void;
}

export function UserCreateModal({ open, companies, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(ROLE_DATA_ENTRY);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ companyId, name, email, password, role }),
      });
      toast("User created", "success");
      setCompanyId("");
      setName("");
      setEmail("");
      setPassword("");
      setRole(ROLE_DATA_ENTRY);
      onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to create user", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-semibold mb-4">Add User to Company</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Field label="Company" htmlFor="uc-company">
            <Select id="uc-company" required value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Name" htmlFor="uc-name">
            <Input id="uc-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="uc-email">
            <Input id="uc-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="uc-password" hint="Min 8 characters">
            <Input id="uc-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Role" htmlFor="uc-role">
            <Select id="uc-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value={ROLE_DATA_ENTRY}>Data Entry</option>
              <option value={ROLE_ADMIN}>Admin</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
