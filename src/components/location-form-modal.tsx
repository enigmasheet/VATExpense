"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

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

  function handleClose() {
    if (loading) return;
    setName("");
    setError(null);
    onCancel();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: { id: string; name: string } }>("/api/locations", {
        method: "POST",
        body: JSON.stringify({ companyId, name: name.trim() }),
      });
      onSaved(res.data);
      setName("");
      setError(null);
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

  return (
    <Modal
      open={open}
      title="Add Location"
      onClose={handleClose}
      width="max-w-sm"
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
    >
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
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Adding..." : "Add Location"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
