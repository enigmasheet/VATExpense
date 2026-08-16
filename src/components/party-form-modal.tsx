"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/lib/useApp";
import { useToast } from "@/components/ui/toast";
import { LocationFormModal } from "@/components/location-form-modal";

interface Location {
  id: string;
  name: string;
}

interface PartyFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    vatNumber: string | null;
    locationId: string | null;
    phone: string | null;
    whatsapp: string | null;
    comment: string | null;
  };
  onSaved: () => void;
  onCancel: () => void;
  initialName?: string;
}

function PartyFormInner({
  mode,
  initial,
  initialName,
  onSaved,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: PartyFormModalProps["initial"];
  initialName: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { companyId } = useApp();
  const { toast } = useToast();
  const isEdit = mode === "edit" && initial;

  const [name, setName] = useState(isEdit ? initial.name : initialName);
  const [vatNumber, setVatNumber] = useState(isEdit ? (initial.vatNumber ?? "") : "");
  const [locationId, setLocationId] = useState(isEdit ? (initial.locationId ?? "") : "");
  const [phone, setPhone] = useState(isEdit ? (initial.phone ?? "") : "");
  const [whatsapp, setWhatsapp] = useState(isEdit ? (initial.whatsapp ?? "") : "");
  const [comment, setComment] = useState(isEdit ? (initial.comment ?? "") : "");

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locModalOpen, setLocModalOpen] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    api<{ data: Location[] }>(`/api/locations?companyId=${companyId}`)
      .then(({ data }) => setLocations(data))
      .catch(() => toast("Failed to load locations", "error"));
  }, [companyId, toast]);

  function handleLocationSaved(loc: { id: string; name: string }) {
    setLocations((prev) => [...prev, loc].sort((a, b) => a.name.localeCompare(b.name)));
    setLocationId(loc.id);
    setLocModalOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        name,
        vatNumber: vatNumber || null,
        locationId: locationId || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        comment: comment || null,
      };
      if (mode === "create") {
        await api("/api/parties", {
          method: "POST",
          body: JSON.stringify({ ...body, companyId }),
        });
      } else {
        await api(`/api/parties/${initial!.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to save party.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {/* Name */}
        <Field label="Party name" htmlFor="pf-name">
          <Input
            id="pf-name"
            required
            placeholder="e.g. ABC Stationers"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        {/* Phone + WhatsApp side by side */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="pf-phone" hint="Optional">
            <Input
              id="pf-phone"
              placeholder="+977-9841234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="WhatsApp / Viber" htmlFor="pf-whatsapp" hint="Optional">
            <Input
              id="pf-whatsapp"
              placeholder="+977-9841234567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </Field>
        </div>

        {/* VAT */}
        <Field label="VAT number" htmlFor="pf-vat" hint="Optional">
          <Input
            id="pf-vat"
            placeholder="e.g. 305123456"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
          />
        </Field>

        {/* Location with + button */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pf-location" className="text-sm font-medium text-foreground">
            Location
          </label>
          <div className="flex gap-2">
            <Select
              id="pf-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="flex-1"
            >
              <option value="">None</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLocModalOpen(true)}
              title="Add new location"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Comment */}
        <Field label="Comment" htmlFor="pf-comment" hint="Optional">
          <Input
            id="pf-comment"
            placeholder="Notes about this supplier..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Add Party" : "Save Changes"}
          </Button>
        </div>
      </form>

      {companyId && (
        <LocationFormModal
          open={locModalOpen}
          companyId={companyId}
          onSaved={handleLocationSaved}
          onCancel={() => setLocModalOpen(false)}
        />
      )}
    </>
  );
}

export function PartyFormModal({
  open,
  mode,
  initial,
  onSaved,
  onCancel,
  initialName = "",
}: PartyFormModalProps) {
  const formKey = `${mode}-${initial?.id ?? "new"}-${initialName}`;

  return (
    <Modal open={open} title={mode === "create" ? "Add Party" : "Edit Party"} onClose={onCancel} width="max-w-lg">
      <PartyFormInner
        key={formKey}
        mode={mode}
        initial={initial}
        initialName={initialName}
        onSaved={onSaved}
        onCancel={onCancel}
      />
    </Modal>
  );
}
