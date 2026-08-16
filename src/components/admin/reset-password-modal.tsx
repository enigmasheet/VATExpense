"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

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
}

export function ResetPasswordModal({ open, user, onClose }: Props) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !user) return null;

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/admin/users/${user!.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      toast("Password reset successfully", "success");
      setPassword("");
      onClose();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to reset password", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-semibold mb-4">Reset Password</h2>
        <p className="text-sm text-muted mb-4">Reset password for <strong>{user.email}</strong></p>
        <form onSubmit={handleReset} className="flex flex-col gap-3">
          <Field label="New password" htmlFor="rp-password" hint="Min 8 characters">
            <Input id="rp-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Resetting..." : "Reset Password"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
