"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { useCategories, useItemCategories } from "@/lib/hooks/use-reference-data";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { SlideOver } from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { SubmitEvent } from "react";
import { queryKeys } from "@/lib/query-keys";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface ItemCategoryLink {
  id: string;
  itemName: string;
  categoryId: string;
  categoryName: string | null;
}

type DeleteTarget =
  | { type: "category"; id: string; name: string }
  | { type: "link"; id: string; name: string };

/**
 * Renders the categories management page with an integrated item-to-category
 * linking section. Categories are the master list; links map item names to a
 * category so expense entry can auto-resolve the category from the item.
 */
export function CategoriesPage() {
  const { companyId } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading: loadingCategories, error: categoriesError } = useCategories(companyId ?? "");
  const { data: links = [], isLoading: loadingLinks, error: linksError } = useItemCategories(companyId ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [linkSearch, setLinkSearch] = useState("");

  // Category slide-over state
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [catFormMode, setCatFormMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catError, setCatError] = useState<string | null>(null);

  // Link slide-over state
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [linkFormMode, setLinkFormMode] = useState<"create" | "edit">("create");
  const [editingLink, setEditingLink] = useState<ItemCategoryLink | null>(null);
  const [linkItemName, setLinkItemName] = useState("");
  const [linkCategoryId, setLinkCategoryId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const error = categoriesError?.message ?? linksError?.message ?? null;

  const invalidateCategories = useCallback(() => {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.categories(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.itemCategories(companyId) });
  }, [companyId, queryClient]);

  const invalidateLinks = useCallback(() => {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.itemCategories(companyId) });
  }, [companyId, queryClient]);

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return api("/api/categories", {
        method: "POST",
        body: JSON.stringify({ companyId, name: name.trim() }),
      });
    },
    onSuccess: () => {
      toast("Category added.");
      invalidateCategories();
    },
    onError: (err) => {
      setCatError(err instanceof ApiError ? err.detail : "Failed to save");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return api(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
    },
    onSuccess: () => {
      toast("Updated.");
      invalidateCategories();
    },
    onError: (err) => {
      setCatError(err instanceof ApiError ? err.detail : "Failed to save");
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async ({ itemName, categoryId }: { itemName: string; categoryId: string }) => {
      return api("/api/item-categories", {
        method: "POST",
        body: JSON.stringify({ itemName: itemName.trim(), categoryId }),
      });
    },
    onSuccess: () => {
      toast("Item link added.");
      invalidateLinks();
    },
    onError: (err) => {
      setLinkError(err instanceof ApiError ? err.detail : "Failed to save");
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, itemName, categoryId }: { id: string; itemName: string; categoryId: string }) => {
      return api(`/api/item-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ itemName: itemName.trim(), categoryId }),
      });
    },
    onSuccess: () => {
      toast("Updated.");
      invalidateLinks();
    },
    onError: (err) => {
      setLinkError(err instanceof ApiError ? err.detail : "Failed to save");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`/api/categories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast("Deleted.");
      invalidateCategories();
    },
    onError: (err) => {
      toast(err instanceof ApiError ? err.detail : "Failed to delete", "error");
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`/api/item-categories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast("Deleted.");
      invalidateLinks();
    },
    onError: (err) => {
      toast(err instanceof ApiError ? err.detail : "Failed to delete", "error");
    },
  });

  function openCreateCategory() {
    setCatFormMode("create");
    setEditingCategory(null);
    setCatName("");
    setCatError(null);
    setCatFormOpen(true);
  }

  function openEditCategory(category: Category) {
    setCatFormMode("edit");
    setEditingCategory(category);
    setCatName(category.name);
    setCatError(null);
    setCatFormOpen(true);
  }

  async function handleSaveCategory(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setCatError(null);
    try {
      if (catFormMode === "create") {
        await createCategoryMutation.mutateAsync(catName);
      } else {
        await updateCategoryMutation.mutateAsync({ id: editingCategory!.id, name: catName });
      }
      setCatFormOpen(false);
    } catch {
      // Error handled by mutation onError
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateLink() {
    setLinkFormMode("create");
    setEditingLink(null);
    setLinkItemName("");
    setLinkCategoryId("");
    setLinkError(null);
    setLinkFormOpen(true);
  }

  function openEditLink(link: ItemCategoryLink) {
    setLinkFormMode("edit");
    setEditingLink(link);
    setLinkItemName(link.itemName);
    setLinkCategoryId(link.categoryId);
    setLinkError(null);
    setLinkFormOpen(true);
  }

  async function handleSaveLink(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setLinkError(null);
    try {
      if (linkFormMode === "create") {
        await createLinkMutation.mutateAsync({ itemName: linkItemName, categoryId: linkCategoryId });
      } else {
        await updateLinkMutation.mutateAsync({ id: editingLink!.id, itemName: linkItemName, categoryId: linkCategoryId });
      }
      setLinkFormOpen(false);
    } catch {
      // Error handled by mutation onError
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "category") {
        await deleteCategoryMutation.mutateAsync(deleteTarget.id);
      } else {
        await deleteLinkMutation.mutateAsync(deleteTarget.id);
      }
    } catch {
      // Error handled by mutation onError
    } finally {
      setDeleteTarget(null);
    }
  }

  const filteredCategories = catSearch
    ? categories.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;

  const filteredLinks = linkSearch
    ? links.filter(
        (l) =>
          l.itemName.toLowerCase().includes(linkSearch.toLowerCase()) ||
          (l.categoryName ?? "").toLowerCase().includes(linkSearch.toLowerCase()),
      )
    : links;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Categories"
        subtitle="Expense categories and item-to-category links used to auto-resolve categories during expense entry."
        actions={
          <Button onClick={openCreateCategory} disabled={!companyId || catFormOpen}>
            Add Category
          </Button>
        }
      />

      {error && <Alert kind="danger">{error}</Alert>}

      <DataTable<Category>
        topContent={
          categories.length > 0 ? (
            <div className="border-b border-border px-4 py-3">
              <Input
                type="text"
                placeholder="Search categories..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                aria-label="Search categories"
              />
            </div>
          ) : null
        }
        emptyState={
          loadingCategories ? (
            <div className="p-6 text-center text-sm text-muted" role="status">Loading...</div>
          ) : categories.length === 0 ? (
            <p className="p-6 text-sm text-muted">No categories yet. Add your first one.</p>
          ) : (
            <p className="p-6 text-sm text-muted">No results for &ldquo;{catSearch}&rdquo;</p>
          )
        }
        columns={[
          { header: "Name", cell: (c) => <span className="font-medium">{c.name}</span> },
          {
            header: "Items linked",
            cell: (c) => links.filter((l) => l.categoryId === c.id).length,
            align: "right",
          },
          {
            header: "Status",
            cell: (c) => (
              <Badge tone={c.isActive ? "success" : "default"}>
                {c.isActive ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            header: "Actions",
            align: "right",
            cell: (c) => (
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEditCategory(c)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => setDeleteTarget({ type: "category", id: c.id, name: c.name })}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
        rows={filteredCategories}
        getKey={(c) => c.id}
        mobileCard={(c) => (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <Badge tone={c.isActive ? "success" : "default"}>
                {c.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-3 flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => openEditCategory(c)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger"
                onClick={() => setDeleteTarget({ type: "category", id: c.id, name: c.name })}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      />

      {/* Item → Category links */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Item-Category Links</h2>
            <p className="mt-1 text-sm text-muted">
              Map item names to categories so the expense form can auto-select the category when you type an item.
            </p>
          </div>
          <Button onClick={openCreateLink} disabled={!companyId || linkFormOpen}>
            Add Link
          </Button>
        </div>

        <DataTable<ItemCategoryLink>
          topContent={
            links.length > 0 ? (
              <div className="border-b border-border px-4 py-3">
                <Input
                  type="text"
                  placeholder="Search item or category..."
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  aria-label="Search item-category links"
                />
              </div>
            ) : null
          }
          emptyState={
            loadingLinks ? (
              <div className="p-6 text-center text-sm text-muted" role="status">Loading...</div>
            ) : links.length === 0 ? (
              <p className="p-6 text-sm text-muted">
                No item links yet. Add one so typing &ldquo;Diesel&rdquo; auto-selects &ldquo;Fuel&rdquo;.
              </p>
            ) : (
              <p className="p-6 text-sm text-muted">No results for &ldquo;{linkSearch}&rdquo;</p>
            )
          }
          columns={[
            { header: "Item", cell: (l) => <span className="font-medium">{l.itemName}</span> },
            { header: "Category", cell: (l) => l.categoryName ?? "—" },
            {
              header: "Actions",
              align: "right",
              cell: (l) => (
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditLink(l)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={() => setDeleteTarget({ type: "link", id: l.id, name: l.itemName })}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
          rows={filteredLinks}
          getKey={(l) => l.id}
          mobileCard={(l) => (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{l.itemName}</span>
                <span className="text-sm text-muted">{l.categoryName ?? "—"}</span>
              </div>
              <div className="mt-3 flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => openEditLink(l)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => setDeleteTarget({ type: "link", id: l.id, name: l.itemName })}
                >
                  Delete
                </Button>
              </div>
            </>
          )}
        />
      </section>

      {/* Category slide-over */}
      <SlideOver
        open={catFormOpen}
        title={catFormMode === "create" ? "Add Category" : `Edit "${editingCategory?.name}"`}
        onClose={() => {
          if (submitting) return;
          setCatFormOpen(false);
        }}
        closeOnEscape={!submitting}
        closeOnOverlayClick={!submitting}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCatFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="category-form" size="sm" loading={submitting} disabled={!companyId}>
              {submitting ? "Saving..." : catFormMode === "create" ? "Add" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSaveCategory} className="flex flex-col gap-4">
          <Field label="Category name" htmlFor="category-name-input">
            <Input
              id="category-name-input"
              required
              placeholder="e.g. Office Supplies"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
          </Field>
          {catError && <Alert kind="danger">{catError}</Alert>}
        </form>
      </SlideOver>

      {/* Link slide-over */}
      <SlideOver
        open={linkFormOpen}
        title={linkFormMode === "create" ? "Add Item Link" : `Edit "${editingLink?.itemName}"`}
        onClose={() => {
          if (submitting) return;
          setLinkFormOpen(false);
        }}
        closeOnEscape={!submitting}
        closeOnOverlayClick={!submitting}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLinkFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="item-link-form" size="sm" loading={submitting} disabled={!companyId}>
              {submitting ? "Saving..." : linkFormMode === "create" ? "Add" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="item-link-form" onSubmit={handleSaveLink} className="flex flex-col gap-4">
          <Field label="Item name" htmlFor="item-link-name" hint="As typed on the expense form, e.g. Diesel">
            <Input
              id="item-link-name"
              required
              placeholder="e.g. Diesel"
              value={linkItemName}
              onChange={(e) => setLinkItemName(e.target.value)}
            />
          </Field>
          <Field label="Category" htmlFor="item-link-category">
            <Select
              id="item-link-category"
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
          {linkError && <Alert kind="danger">{linkError}</Alert>}
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name ?? ""}"?`}
        message={
          deleteTarget?.type === "category"
            ? "This will delete the category. Links pointing to it will also be removed."
            : "This will remove the item-to-category mapping."
        }
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
