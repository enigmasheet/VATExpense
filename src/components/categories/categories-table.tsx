"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { SlideOver } from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { queryKeys } from "@/lib/query-keys";
import type { Category, ItemCategoryLink } from "@/lib/types/entities";
import type { SubmitEvent } from "react";

interface CategoriesTableProps {
  categories: Category[];
  links: ItemCategoryLink[];
  isLoading: boolean;
  error: string | null;
}

export function CategoriesTable({ categories, links, isLoading, error }: CategoriesTableProps) {
  const { companyId } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const invalidate = useCallback(() => {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.categories(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.itemCategories(companyId) });
  }, [companyId, queryClient]);

  const createMutation = useMutation({
    mutationFn: async (catName: string) => {
      return api("/api/categories", {
        method: "POST",
        body: JSON.stringify({ companyId, name: catName.trim() }),
      });
    },
    onSuccess: () => { toast("Category added."); invalidate(); },
    onError: (err) => { setFormError(err instanceof ApiError ? err.detail : "Failed to save"); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, catName }: { id: string; catName: string }) => {
      return api(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: catName.trim() }),
      });
    },
    onSuccess: () => { toast("Updated."); invalidate(); },
    onError: (err) => { setFormError(err instanceof ApiError ? err.detail : "Failed to save"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast("Deleted."); invalidate(); },
    onError: (err) => { toast(err instanceof ApiError ? err.detail : "Failed to delete", "error"); },
  });

  function openCreate() {
    setFormMode("create"); setEditing(null); setName(""); setFormError(null); setFormOpen(true);
  }

  function openEdit(cat: Category) {
    setFormMode("edit"); setEditing(cat); setName(cat.name); setFormError(null); setFormOpen(true);
  }

  async function handleSave(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true); setFormError(null);
    try {
      if (formMode === "create") await createMutation.mutateAsync(name);
      else await updateMutation.mutateAsync({ id: editing!.id, catName: name });
      setFormOpen(false);
    } catch { /* onError handles it */ } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try { await deleteMutation.mutateAsync(deleteTarget.id); }
    catch { /* onError handles it */ } finally { setDeleteTarget(null); }
  }

  const filtered = search
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  return (
    <>
      {error && <Alert kind="danger">{error}</Alert>}

      <DataTable<Category>
        topContent={categories.length > 0 ? (
          <div className="border-b border-border px-4 py-3">
            <Input type="text" placeholder="Search categories..." value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search categories" />
          </div>
        ) : null}
        emptyState={
          isLoading ? <div className="p-6 text-center text-sm text-muted" role="status">Loading...</div>
          : categories.length === 0 ? <p className="p-6 text-sm text-muted">No categories yet. Add your first one.</p>
          : <p className="p-6 text-sm text-muted">No results for &ldquo;{search}&rdquo;</p>
        }
        columns={[
          { header: "Name", cell: (c) => <span className="font-medium">{c.name}</span> },
          { header: "Items linked", cell: (c) => links.filter((l) => l.categoryId === c.id).length, align: "right" },
          { header: "Status", cell: (c) => <Badge tone={c.isActive ? "success" : "default"}>{c.isActive ? "Active" : "Inactive"}</Badge> },
          { header: "Actions", align: "right", cell: (c) => (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-danger hover:text-danger"
                onClick={() => setDeleteTarget({ id: c.id, name: c.name })}>Delete</Button>
            </div>
          )},
        ]}
        rows={filtered}
        getKey={(c) => c.id}
        mobileCard={(c) => (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <Badge tone={c.isActive ? "success" : "default"}>{c.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="mt-3 flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-danger hover:text-danger"
                onClick={() => setDeleteTarget({ id: c.id, name: c.name })}>Delete</Button>
            </div>
          </>
        )}
      />

      <SlideOver open={formOpen}
        title={formMode === "create" ? "Add Category" : `Edit "${editing?.name}"`}
        onClose={() => { if (!submitting) setFormOpen(false); }}
        closeOnEscape={!submitting} closeOnOverlayClick={!submitting}
        footer={<>
          <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="category-form" size="sm" loading={submitting} disabled={!companyId}>
            {submitting ? "Saving..." : formMode === "create" ? "Add" : "Save changes"}
          </Button>
        </>}
      >
        <form id="category-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Category name" htmlFor="category-name-input">
            <Input id="category-name-input" required placeholder="e.g. Office Supplies" value={name}
              onChange={(e) => setName(e.target.value)} />
          </Field>
          {formError && <Alert kind="danger">{formError}</Alert>}
        </form>
      </SlideOver>

      <ConfirmDialog open={deleteTarget !== null} title={`Delete "${deleteTarget?.name ?? ""}"?`}
        message="This will delete the category. Links pointing to it will also be removed."
        confirmLabel="Delete" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}
