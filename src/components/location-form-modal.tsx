"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

interface LocationFormModalProps {
  open: boolean;
  companyId: string;
  onSaved: (location: { id: string; name: string }) => void;
  onCancel: () => void;
}

export function LocationFormModal({
  open,
  companyId,
  onSaved,
  onCancel,
}: LocationFormModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: { id: string; name: string } }>("/api/locations", {
        method: "POST",
        body: JSON.stringify({ companyId, name }),
      });
      onSaved(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to create location.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-form-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="mx-4 w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl">
        <h2 id="location-form-title" className="font-display text-lg font-semibold text-foreground">
          Add Location
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Field label="Location name" htmlFor="lf-name">
            <Input
              id="lf-name"
              required
              placeholder="e.g. Pokhara"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Adding..." : "Add Location"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
