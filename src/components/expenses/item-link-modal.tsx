"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MessageList } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { queryKeys } from "@/lib/query-keys";
import type { Category } from "@/lib/hooks/use-reference-data";

export interface ItemLinkModalProps {
  open: boolean;
  itemName: string;
  categories: Category[];
  companyId: string;
  onSaved: (itemName: string, categoryId: string) => void;
  onClose: () => void;
}

export function ItemLinkModal({
  open,
  itemName,
  categories,
  companyId,
  onSaved,
  onClose,
}: ItemLinkModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkName, setLinkName] = useState(itemName);
  const [linkCategoryId, setLinkCategoryId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!companyId || !linkName.trim() || !linkCategoryId) return;
    setSaving(true);
    setLinkError(null);
    try {
      await api("/api/item-categories", {
        method: "POST",
        body: JSON.stringify({ itemName: linkName.trim(), categoryId: linkCategoryId }),
      });
      toast("Item linked to category.");
      onClose();
      queryClient.invalidateQueries({ queryKey: queryKeys.itemCategories(companyId) });
      setTimeout(() => {
        onSaved(linkName.trim(), linkCategoryId);
      }, 100);
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.detail : "Failed to save item link");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Link item to category"
      description="New items are saved as links so their category is picked automatically next time."
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      closeOnEscape={!saving}
      closeOnOverlayClick={!saving}
    >
      <form
        id="item-link-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Item name" htmlFor="link-item-name" hint="As typed on the invoice, e.g. Diesel">
          <Input
            id="link-item-name"
            required
            placeholder="e.g. Diesel"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
          />
        </Field>
        <Field label="Category" htmlFor="link-category-id">
          <Select
            id="link-category-id"
            required
            value={linkCategoryId}
            onChange={(e) => setLinkCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        {linkError && <MessageList messages={[{ kind: "danger", text: linkError }]} />}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving} disabled={!companyId}>
            {saving ? "Saving..." : "Save link"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
