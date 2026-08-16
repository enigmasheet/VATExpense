"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ROLE_ADMIN, ROLE_DATA_ENTRY } from "@/lib/constants";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  companyId: string;
  companyName: string | null;
}

interface Props {
  open: boolean;
  user: UserData | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserEditModal({ open, user, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLE_DATA_ENTRY);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.isActive);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state from prop is intentional
  }, [user]);

  if (!open || !user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/admin/users/${user!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, email, role, isActive }),
      });
      toast("User updated", "success");
      onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to update user", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-semibold mb-4">Edit User</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Field label="Name" htmlFor="ue-name">
            <Input id="ue-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="ue-email">
            <Input id="ue-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Role" htmlFor="ue-role">
            <Select id="ue-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value={ROLE_ADMIN}>Admin</option>
              <option value={ROLE_DATA_ENTRY}>Data Entry</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Active
          </label>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
