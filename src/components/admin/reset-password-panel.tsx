"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { SlideOver } from "@/components/admin/slide-over";
import { UserAvatar } from "@/components/admin/user-avatar";

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

/**
 * Slide-over panel for resetting a user's password.
 */
export function ResetPasswordPanel({ open, user, onClose }: Props) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast("Passwords do not match", "error");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/admin/users/${user!.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      toast("Password reset successfully", "success");
      setPassword("");
      setConfirm("");
      onClose();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to reset password", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      title="Reset Password"
      description={user ? `Set a new password for ${user.email}` : undefined}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="reset-password-form" disabled={saving}>
            {saving ? "Resetting..." : "Reset password"}
          </Button>
        </>
      }
    >
      {user && (
        <div className="mb-5 flex items-center gap-3">
          <UserAvatar name={user.name} email={user.email} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>
      )}

      <form id="reset-password-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="New password" htmlFor="rp-password" hint="Min 8 characters">
          <Input
            id="rp-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm password" htmlFor="rp-confirm">
          <Input
            id="rp-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
      </form>
    </SlideOver>
  );
}