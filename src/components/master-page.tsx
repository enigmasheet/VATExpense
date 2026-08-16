"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
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
}

interface Option {
  value: string;
  label: string;
}

/**
 * Renders a company-scoped master-record management page with full CRUD.
 *
 * @param title - The page title
 * @param description - Optional text displayed below the title
 * @param listUrl - API endpoint used to list and modify records
 * @param fields - Definitions for fields in the add-record form (also used for edit)
 * @param columns - Custom columns rendered for each record
 * @param buildPayload - Creates the API payload from the company ID and form values
 * @param emptyHint - Message displayed when no records exist
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
}: MasterPageProps<T>) {
  const { companyId } = useApp();
  const { toast } = useToast();
  const [items, setItems] = useState<T[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const refresh = useCallback(() => {
    if (!companyId) return;
    api<{ data: T[] }>(`${listUrl}?companyId=${companyId}`)
      .then(({ data }) => setItems(data))
      .catch((e: ApiError) => setError(e.detail))
      .finally(() => setLoading(false));
  }, [companyId, listUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!companyId) return;
    const urls = fields
      .filter((f) => f.optionsUrl)
      .map((f) => f.optionsUrl as string);
    Promise.all(
      urls.map((url) =>
        api<{ data: { id: string; name: string }[] }>(`${url}?companyId=${companyId}`).then(
          ({ data }) => [url, data.map((o) => ({ value: o.id, label: o.name }))] as const,
        ),
      ),
    )
      .then((pairs) => setOptions(Object.fromEntries(pairs)))
      .catch((e) => console.error("Failed to load dropdown options:", e));
  }, [companyId, fields]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`${listUrl}`, {
        method: "POST",
        body: JSON.stringify(buildPayload(companyId, values)),
      });
      setValues({});
      refresh();
      toast(`${singularName ?? title.slice(0, -1)} added.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: T) {
    setEditingId(item.id);
    const initial: Record<string, string> = {};
    for (const f of fields) {
      const val = item[f.name as keyof T];
      initial[f.name] = val !== null && val !== undefined ? String(val) : "";
    }
    setEditValues(initial);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function saveEdit(id: string) {
    if (!companyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.name in editValues) {
          const val = editValues[f.name];
          body[f.name] = val === "" ? null : val;
        }
      }
      await api(`${listUrl}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setEditingId(null);
      setEditValues({});
      refresh();
      toast("Updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleActive(item: T) {
    setToggleTarget(item);
  }

  async function confirmToggleActive() {
    if (!toggleTarget || !companyId) return;
    try {
      await api(`${listUrl}/${toggleTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !toggleTarget.isActive }),
      });
      setToggleTarget(null);
      refresh();
      toast(`${toggleTarget.name} ${toggleTarget.isActive ? "deactivated" : "activated"}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update status");
    }
  }

  function confirmDelete(id: string, name: string) {
    setDeleteTarget({ id, name });
  }

  async function deleteItem() {
    if (!deleteTarget || !companyId) return;
    try {
      await api(`${listUrl}/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      refresh();
      toast("Deleted.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete");
    }
  }

  const filtered = search
    ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  function renderEditField(field: FieldSpec) {
    const id = `edit-${field.name}`;
    const value = editValues[field.name] ?? "";

    if (field.type === "select") {
      return (
        <Field key={field.name} label={field.label} htmlFor={id}>
          <Select
            id={id}
            value={value}
            onChange={(e) => setEditValues((v) => ({ ...v, [field.name]: e.target.value }))}
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
          onChange={(e) => setEditValues((v) => ({ ...v, [field.name]: e.target.value }))}
        />
      </Field>
    );
  }

  const nameCell = (item: T) =>
    editingId === item.id ? (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(renderEditField)}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => saveEdit(item.id)} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    ) : (
      <span className="font-medium">{item.name}</span>
    );

  const actions = (item: T) =>
    editingId !== item.id && (
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => confirmDelete(item.id, item.name)}>
          Delete
        </Button>
      </div>
    );

  const mobileCard = (item: T) =>
    editingId === item.id ? (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3">
          {fields.map(renderEditField)}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => saveEdit(item.id)} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    ) : (
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
          <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
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
      <PageHeader title={title} subtitle={description} />

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => {
            const id = `master-${field.name}`;
            if (field.type === "checkbox") {
              return (
                <Field key={field.name} label={field.label} htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    className="h-5 w-5 accent-primary"
                    checked={values[field.name] === "true"}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [field.name]: String(e.target.checked) }))
                    }
                  />
                </Field>
              );
            }
            if (field.type === "select") {
              return (
                <Field key={field.name} label={field.label} htmlFor={id}>
                  <Select
                    id={id}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
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
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              </Field>
            );
          })}
        </div>
        <div>
          <Button type="submit" disabled={submitting || !companyId}>
            {submitting ? "Saving..." : "Add"}
          </Button>
        </div>
        {error && <Alert kind="danger">{error}</Alert>}
      </form>

      <DataTable
        topContent={
          items.length > 0 ? (
            <div className="border-b border-border px-4 py-3">
              <input
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </div>
          ) : null
        }
        emptyState={
          loading ? (
            <div className="p-6 text-center text-sm text-muted">Loading...</div>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted">{emptyHint}</p>
          ) : (
            <p className="p-6 text-sm text-muted">No results for &ldquo;{search}&rdquo;</p>
          )
        }
        columns={[
          { header: "Name", cell: (item) => nameCell(item) },
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
