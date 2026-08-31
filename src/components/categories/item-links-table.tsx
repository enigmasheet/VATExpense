"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { SlideOver } from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { queryKeys } from "@/lib/query-keys";
import type { Category, ItemCategoryLink } from "@/lib/types/entities";
import type { SubmitEvent } from "react";

interface ItemLinksTableProps {
  links: ItemCategoryLink[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

export function ItemLinksTable({ links, categories, isLoading, error }: ItemLinksTableProps) {
  const { companyId } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<ItemCategoryLink | null>(null);
  const [itemName, setItemName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const invalidate = useCallback(() => {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.itemCategories(companyId) });
  }, [companyId, queryClient]);

  const createMutation = useMutation({
    mutationFn: async ({ itemName: item, categoryId: cat }: { itemName: string; categoryId: string }) => {
      return api("/api/item-categories", {
        method: "POST",
        body: JSON.stringify({ itemName: item.trim(), categoryId: cat }),
      });
    },
    onSuccess: () => { toast("Item link added."); invalidate(); },
    onError: (err) => { setFormError(err instanceof ApiError ? err.detail : "Failed to save"); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, itemName: item, categoryId: cat }: { id: string; itemName: string; categoryId: string }) => {
      return api(`/api/item-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ itemName: item.trim(), categoryId: cat }),
      });
    },
    onSuccess: () => { toast("Updated."); invalidate(); },
    onError: (err) => { setFormError(err instanceof ApiError ? err.detail : "Failed to save"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api(`/api/item-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast("Deleted."); invalidate(); },
    onError: (err) => { toast(err instanceof ApiError ? err.detail : "Failed to delete", "error"); },
  });

  function openCreate() {
    setFormMode("create"); setEditing(null); setItemName(""); setCategoryId(""); setFormError(null); setFormOpen(true);
  }

  function openEdit(link: ItemCategoryLink) {
    setFormMode("edit"); setEditing(link); setItemName(link.itemName); setCategoryId(link.categoryId); setFormError(null); setFormOpen(true);
  }

  async function handleSave(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true); setFormError(null);
    try {
      if (formMode === "create") await createMutation.mutateAsync({ itemName, categoryId });
      else await updateMutation.mutateAsync({ id: editing!.id, itemName, categoryId });
      setFormOpen(false);
    } catch { /* onError handles it */ } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try { await deleteMutation.mutateAsync(deleteTarget.id); }
    catch { /* onError handles it */ } finally { setDeleteTarget(null); }
  }

  const filtered = search
    ? links.filter(
        (l) => l.itemName.toLowerCase().includes(search.toLowerCase()) ||
          (l.categoryName ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : links;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Item-Category Links</h2>
          <p className="mt-1 text-sm text-muted">
            Map item names to categories so the expense form can auto-select the category when you type an item.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!companyId || formOpen}>Add Link</Button>
      </div>

      {error && <Alert kind="danger">{error}</Alert>}

      <DataTable<ItemCategoryLink>
        topContent={links.length > 0 ? (
          <div className="border-b border-border px-4 py-3">
            <Input type="text" placeholder="Search item or category..." value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search item-category links" />
          </div>
        ) : null}
        emptyState={
          isLoading ? <div className="p-6 text-center text-sm text-muted" role="status">Loading...</div>
          : links.length === 0 ? (
            <p className="p-6 text-sm text-muted">
              No item links yet. Add one so typing &ldquo;Diesel&rdquo; auto-selects &ldquo;Fuel&rdquo;.
            </p>
          ) : <p className="p-6 text-sm text-muted">No results for &ldquo;{search}&rdquo;</p>
        }
        columns={[
          { header: "Item", cell: (l) => <span className="font-medium">{l.itemName}</span> },
          { header: "Category", cell: (l) => l.categoryName ?? "—" },
          { header: "Actions", align: "right", cell: (l) => (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-danger hover:text-danger"
                onClick={() => setDeleteTarget({ id: l.id, name: l.itemName })}>Delete</Button>
            </div>
          )},
        ]}
        rows={filtered}
        getKey={(l) => l.id}
        mobileCard={(l) => (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{l.itemName}</span>
              <span className="text-sm text-muted">{l.categoryName ?? "—"}</span>
            </div>
            <div className="mt-3 flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-danger hover:text-danger"
                onClick={() => setDeleteTarget({ id: l.id, name: l.itemName })}>Delete</Button>
            </div>
          </>
        )}
      />

      <SlideOver open={formOpen}
        title={formMode === "create" ? "Add Item Link" : `Edit "${editing?.itemName}"`}
        onClose={() => { if (!submitting) setFormOpen(false); }}
        closeOnEscape={!submitting} closeOnOverlayClick={!submitting}
        footer={<>
          <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="item-link-form" size="sm" loading={submitting} disabled={!companyId}>
            {submitting ? "Saving..." : formMode === "create" ? "Add" : "Save changes"}
          </Button>
        </>}
      >
        <form id="item-link-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Item name" htmlFor="item-link-name" hint="As typed on the expense form, e.g. Diesel">
            <Input id="item-link-name" required placeholder="e.g. Diesel" value={itemName}
              onChange={(e) => setItemName(e.target.value)} />
          </Field>
          <Field label="Category" htmlFor="item-link-category">
            <Select id="item-link-category" required value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          {formError && <Alert kind="danger">{formError}</Alert>}
        </form>
      </SlideOver>

      <ConfirmDialog open={deleteTarget !== null} title={`Delete "${deleteTarget?.name ?? ""}"?`}
        message="This will remove the item-to-category mapping."
        confirmLabel="Delete" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}
