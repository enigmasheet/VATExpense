"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, apiUrl } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { SlideOver } from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";

export interface FieldSpec {
  name: string;
  label: string;
  type: "text" | "number" | "checkbox" | "select";
  optionsUrl?: string;
  required?: boolean;
  placeholder?: string;
}

export interface ColumnSpec<T> {
  header: string;
  render: (item: T) => ReactNode;
}

interface MasterPageProps<T> {
  title: string;
  singularName?: string;
  description?: string;
  listUrl: string;
  fields: FieldSpec[];
  columns: ColumnSpec<T>[];
  buildPayload: (companyId: string, values: Record<string, string>) => Record<string, unknown>;
  emptyHint: string;
  queryKeyFactory?: (companyId: string) => readonly [string, string];
}

interface Option {
  value: string;
  label: string;
}

function getQueryKeyFromUrl(listUrl: string): string {
  if (listUrl.includes("/locations")) return "locations";
  if (listUrl.includes("/trucks")) return "trucks";
  if (listUrl.includes("/parties")) return "parties";
  if (listUrl.includes("/fiscal-years")) return "fiscal-years";
  if (listUrl.includes("/categories")) return "categories";
  if (listUrl.includes("/item-categories")) return "item-categories";
  return listUrl.replace(/^\/api\//, "").replace(/\//g, "-");
}

/**
 * Renders a company-scoped master-record management page with full CRUD.
 * Create and edit are handled through a right-side slide-over panel while
 * the record list stays visible; delete and active toggles use confirmations.
 *
 * @param title - The page title
 * @param singularName - The singular record name used for panel and button labels
 * @param description - Optional text displayed below the title
 * @param listUrl - API endpoint used to list and modify records
 * @param fields - Definitions for fields in the add-record form (also used for edit)
 * @param columns - Custom columns rendered for each record
 * @param buildPayload - Creates the API payload from the company ID and form values
 * @param emptyHint - Message displayed when no records exist
 * @param queryKeyFactory - Optional function to create React Query key for caching
 */
export function MasterPage<T extends { id: string; name: string; isActive: boolean }>({
  title,
  singularName,
  description,
  listUrl,
  fields,
  columns,
  buildPayload,
  emptyHint,
  queryKeyFactory,
}: MasterPageProps<T>) {
  const { companyId } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resourceKey = getQueryKeyFromUrl(listUrl);
  const defaultQueryKeyFactory = useCallback(
    (cid: string) => [resourceKey, cid] as const,
    [resourceKey]
  );

  const keyFactory = queryKeyFactory ?? defaultQueryKeyFactory;

  const { data: items = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: keyFactory(companyId ?? ""),
    queryFn: async () => {
      const res = await api<{ data: T[] }>(apiUrl(listUrl, { companyId: companyId ?? "" }));
      return res.data;
    },
    enabled: !!companyId,
    staleTime: 30 * 60 * 1000,
    gcTime: 10 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<T | null>(null);
  const [search, setSearch] = useState("");

  // Slide-over form state (create + edit share one panel)
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<T | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const urls = fields
      .filter((f) => f.optionsUrl)
      .map((f) => f.optionsUrl as string);
    Promise.all(
      urls.map((url) =>
        api<{ data: { id: string; name: string }[] }>(apiUrl(url, { companyId })).then(
          ({ data }) => [url, data.map((o) => ({ value: o.id, label: o.name }))] as const,
        ),
      ),
    )
      .then((pairs) => setOptions(Object.fromEntries(pairs)))
      .catch((e) => console.error("Failed to load dropdown options:", e));
  }, [companyId, fields]);

  const invalidateList = useCallback(() => {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: keyFactory(companyId) });
  }, [companyId, queryClient, keyFactory]);

  function openCreate() {
    setFormMode("create");
    setEditingItem(null);
    setFormValues({});
    setError(null);
    setFormOpen(true);
  }

  function openEdit(item: T) {
    setFormMode("edit");
    setEditingItem(item);
    const initial: Record<string, string> = {};
    for (const f of fields) {
      const val = item[f.name as keyof T];
      initial[f.name] = val !== null && val !== undefined ? String(val) : "";
    }
    setFormValues(initial);
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (submitting) return;
    setFormOpen(false);
    setEditingItem(null);
    setError(null);
    setFormValues({});
  }

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return api(listUrl, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setFormValues({});
      toast(`${singularName ?? title} added.`);
      invalidateList();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.detail : "Failed to save");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      return api(`${listUrl}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      closeForm();
      toast("Updated.");
      invalidateList();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.detail : "Failed to save");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return api(`${listUrl}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: (_data, variables) => {
      setToggleTarget(null);
      toast(`${variables.id} ${variables.isActive ? "deactivated" : "activated"}.`);
      invalidateList();
    },
    onError: (err) => {
      toast(err instanceof ApiError ? err.detail : "Failed to update status", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${listUrl}/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      setDeleteTarget(null);
      toast("Deleted.");
      invalidateList();
    },
    onError: (err) => {
      toast(err instanceof ApiError ? err.detail : "Failed to delete", "error");
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setError(null);

    const trimmedValues: Record<string, string> = {};
    for (const key of Object.keys(formValues)) {
      const field = fields.find((f) => f.name === key);
      const val = formValues[key];
      trimmedValues[key] = field?.type === "text" ? val.trim() : val;
    }

    if (formMode === "create") {
      const payload = buildPayload(companyId, trimmedValues);
      createMutation.mutate(payload);
    } else {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.name in trimmedValues) {
          const val = trimmedValues[f.name];
          body[f.name] = val === "" ? null : val;
        }
      }
      updateMutation.mutate({ id: editingItem!.id, body });
    }
    setSubmitting(false);
  }

  function toggleActive(item: T) {
    setToggleTarget(item);
  }

  function confirmToggleActive() {
    if (!toggleTarget) return;
    toggleMutation.mutate({ id: toggleTarget.id, isActive: !toggleTarget.isActive });
  }

  function confirmDelete(id: string, name: string) {
    setDeleteTarget({ id, name });
  }

  function deleteItem() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  }

  const filtered = search
    ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  function renderField(field: FieldSpec) {
    const id = `master-${field.name}`;
    const value = formValues[field.name] ?? "";

    if (field.type === "checkbox") {
      return (
        <Field key={field.name} label={field.label} htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            className="h-5 w-5 accent-primary"
            checked={value === "true"}
            onChange={(e) => setFormValues((v) => ({ ...v, [field.name]: String(e.target.checked) }))}
          />
        </Field>
      );
    }

    if (field.type === "select") {
      return (
        <Field key={field.name} label={field.label} htmlFor={id}>
          <Select
            id={id}
            value={value}
            onChange={(e) => setFormValues((v) => ({ ...v, [field.name]: e.target.value }))}
          >
            <option value="">—</option>
            {(options[field.optionsUrl ?? ""] ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      );
    }

    return (
      <Field key={field.name} label={field.label} htmlFor={id}>
        <Input
          id={id}
          type={field.type}
          required={field.required}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => setFormValues((v) => ({ ...v, [field.name]: e.target.value }))}
        />
      </Field>
    );
  }

  const actions = (item: T) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={() => openEdit(item)} disabled={formOpen}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => confirmDelete(item.id, item.name)}>
        Delete
      </Button>
    </div>
  );

  const mobileCard = (item: T) => (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{item.name}</span>
        <button
          onClick={() => toggleActive(item)}
          className="cursor-pointer"
          aria-label={`Toggle ${item.name} ${item.isActive ? "inactive" : "active"}`}
        >
          <Badge tone={item.isActive ? "success" : "default"}>
            {item.isActive ? "Active" : "Inactive"}
          </Badge>
        </button>
      </div>
      {columns.map((col) => (
        <div key={col.header} className="text-sm text-muted">
          {col.render(item)}
        </div>
      ))}
      <div className="mt-3 flex gap-3">
        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} disabled={formOpen}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => confirmDelete(item.id, item.name)}>
          Delete
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        subtitle={description}
        actions={
          <Button onClick={openCreate} disabled={!companyId || formOpen}>
            Add {singularName ?? title}
          </Button>
        }
      />

      {error && <Alert kind="danger">{error}</Alert>}
      {queryError && <Alert kind="danger">{(queryError as Error).message}</Alert>}

      <DataTable
        topContent={
          items.length > 0 ? (
            <div className="border-b border-border px-4 py-3">
              <Input
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={`Search ${title.toLowerCase()}`}
              />
            </div>
          ) : null
        }
        emptyState={
          loading ? (
            <div className="p-6 text-center text-sm text-muted" role="status">Loading...</div>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted">{emptyHint}</p>
          ) : (
            <p className="p-6 text-sm text-muted">No results for &ldquo;{search}&rdquo;</p>
          )
        }
        columns={[
          { header: "Name", cell: (item) => <span className="font-medium">{item.name}</span> },
          ...columns.map((col) => ({
            header: col.header,
            cell: (item: T) => <span className="text-muted">{col.render(item)}</span>,
          })),
          {
            header: "Status",
            cell: (item) => (
              <button
                onClick={() => toggleActive(item)}
                className="cursor-pointer"
                aria-label={`Toggle ${item.name} ${item.isActive ? "inactive" : "active"}`}
              >
                <Badge tone={item.isActive ? "success" : "default"}>
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </button>
            ),
          },
          { header: "Actions", align: "right", cell: (item) => actions(item) },
        ]}
        rows={filtered}
        getKey={(item) => item.id}
        mobileCard={mobileCard}
      />

      <SlideOver
        open={formOpen}
        title={
          formMode === "create"
            ? `Add ${singularName ?? title}`
            : `Edit ${singularName ?? title}`
        }
        onClose={closeForm}
        closeOnEscape={!submitting}
        closeOnOverlayClick={!submitting}
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={closeForm} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="master-crud-form" size="sm" loading={submitting} disabled={!companyId}>
              {submitting ? "Saving..." : formMode === "create" ? "Add" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="master-crud-form" onSubmit={handleSave} className="flex flex-col gap-4">
          {fields.map(renderField)}
          {error && <Alert kind="danger">{error}</Alert>}
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={toggleTarget !== null}
        title={toggleTarget?.isActive ? `Deactivate "${toggleTarget?.name}"?` : `Activate "${toggleTarget?.name}"?`}
        message={toggleTarget?.isActive ? "This will mark the item as inactive. You can reactivate it later." : "This will mark the item as active."}
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        danger={!!toggleTarget?.isActive}
        onConfirm={confirmToggleActive}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}