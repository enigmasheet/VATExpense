"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ROLE_ADMIN, ROLE_DATA_ENTRY } from "@/lib/constants";
import { SlideOver } from "@/components/ui/slide-over";
import { UserAvatar } from "@/components/admin/user-avatar";

interface CompanyOption {
  id: string;
  name: string;
}

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
  mode: "create" | "edit";
  open: boolean;
  user: UserData | null;
  companies: CompanyOption[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Slide-over panel for creating or editing a user. Replaces the old modal
 * for a more spacious, context-preserving editing experience.
 */
export function UserFormPanel({ mode, open, user, companies, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(ROLE_DATA_ENTRY);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const editing = mode === "edit";

  // Sync form state whenever the panel opens so stale values don't leak between edits.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state when opening is intentional
      setCompanyId(user?.companyId ?? "");
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setPassword("");
      setRole(user?.role ?? ROLE_DATA_ENTRY);
      setIsActive(user?.isActive ?? true);
    }
  }, [open, user]);

  function handleClose() {
    if (saving) return;
    setCompanyId("");
    setName("");
    setEmail("");
    setPassword("");
    setRole(ROLE_DATA_ENTRY);
    setIsActive(true);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/admin/users/${user!.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim(), email: email.trim(), role, isActive }),
        });
        toast("User updated", "success");
      } else {
        await api("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({ companyId, name: name.trim(), email: email.trim(), password, role }),
        });
        toast("User created", "success");
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to save user", "error");
      setPassword("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      title={editing ? "Edit User" : "Create User"}
      description={
        editing
          ? `Update ${user?.email ?? ""}`
          : "Add a new user to a company with a role."
      }
      onClose={handleClose}
      closeOnEscape={!saving}
      closeOnOverlayClick={!saving}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Create user"}
          </Button>
        </>
      }
    >
      {editing && user && (
        <div className="mb-5 flex items-center gap-3">
          <UserAvatar name={user.name} email={user.email} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>
      )}

      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!editing && (
          <Field label="Company" htmlFor="user-company">
            <Select id="user-company" required value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Name" htmlFor="user-name">
          <Input id="user-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="user-email">
          <Input id="user-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {!editing && (
          <Field label="Password" htmlFor="user-password" hint="Min 8 characters">
            <Input
              id="user-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        <Field label="Role" htmlFor="user-role">
          <Select id="user-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value={ROLE_DATA_ENTRY}>Data Entry</option>
            <option value={ROLE_ADMIN}>Admin</option>
          </Select>
        </Field>
        {editing && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Account is active
          </label>
        )}
      </form>
    </SlideOver>
  );
}