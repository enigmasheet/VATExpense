"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/use-app";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";

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
 * Renders a company-scoped master-record management page.
 *
 * @param title - The page title
 * @param description - Optional text displayed below the title
 * @param listUrl - API endpoint used to list and modify records
 * @param fields - Definitions for fields in the add-record form
 * @param columns - Custom columns rendered for each record
 * @param buildPayload - Creates the API payload from the company ID and form values
 * @param emptyHint - Message displayed when no records exist
 */
export function MasterPage<T extends { id: string; name: string; isActive: boolean }>({
  title,
  description,
  listUrl,
  fields,
  columns,
  buildPayload,
  emptyHint,
}: MasterPageProps<T>) {
  const { companyId } = useApp();
  const [items, setItems] = useState<T[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
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
      .catch(() => {});
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
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: T) {
    setEditingId(item.id);
    setEditValues({ name: item.name });
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
      await api(`${listUrl}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editValues.name }),
      });
      setEditingId(null);
      setEditValues({});
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: T) {
    if (!companyId) return;
    try {
      await api(`${listUrl}/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      refresh();
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
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete");
    }
  }

  const filtered = search
    ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const nameCell = (item: T) =>
    editingId === item.id ? (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editValues.name ?? ""}
          onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          autoFocus
        />
        <Button size="sm" onClick={() => saveEdit(item.id)} disabled={submitting}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEdit}>
          Cancel
        </Button>
      </div>
    ) : (
      <span className="font-medium">{item.name}</span>
    );

  const actions = (item: T) =>
    editingId !== item.id && (
      <div className="flex items-center justify-end gap-2">
        <button className="text-sm text-primary hover:underline" onClick={() => startEdit(item)}>
          Edit
        </button>
        <button
          className="text-sm text-danger hover:underline"
          onClick={() => confirmDelete(item.id, item.name)}
        >
          Delete
        </button>
      </div>
    );

  const mobileCard = (item: T) =>
    editingId === item.id ? (
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={editValues.name ?? ""}
          onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => saveEdit(item.id)} disabled={submitting}>
            Save
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
          <button className="text-sm text-primary hover:underline" onClick={() => startEdit(item)}>
            Edit
          </button>
          <button
            className="text-sm text-danger hover:underline"
            onClick={() => confirmDelete(item.id, item.name)}
          >
            Delete
          </button>
        </div>
      </>
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>

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
            {submitting ? "Saving…" : "Add"}
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <div className="rounded-lg border border-border bg-surface">
        {/* Search filter */}
        {items.length > 0 && (
          <div className="border-b border-border px-4 py-3">
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </div>
        )}

        {loading ? (
          <div className="p-6 text-center text-sm text-muted">Loading...</div>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted">{emptyHint}</p>
        ) : (() => {
          const filtered = search
            ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
            : items;
          return filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted">No results for &ldquo;{search}&rdquo;</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">Name</th>
                      {columns.map((col) => (
                        <th key={col.header} className="px-4 py-3">
                          {col.header}
                        </th>
                      ))}
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValues.name ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => saveEdit(item.id)}
                              disabled={submitting}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium">{item.name}</span>
                        )}
                      </td>
                      {columns.map((col) => (
                        <td key={col.header} className="px-4 py-3 text-muted">
                          {col.render(item)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(item)}
                          className="cursor-pointer"
                          aria-label={`Toggle ${item.name} ${item.isActive ? "inactive" : "active"}`}
                        >
                          <Badge tone={item.isActive ? "success" : "default"}>
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId !== item.id && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="text-sm text-primary hover:underline"
                              onClick={() => startEdit(item)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-sm text-danger hover:underline"
                              onClick={() => confirmDelete(item.id, item.name)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden">
              {filtered.map((item) => (
                <div key={item.id} className="border-b border-border p-4 last:border-b-0">
                  {editingId === item.id ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={editValues.name ?? ""}
                        onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                        className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(item.id)}
                          disabled={submitting}
                        >
                          Save
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
                        <button
                          className="text-sm text-primary hover:underline"
                          onClick={() => startEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm text-danger hover:underline"
                          onClick={() => confirmDelete(item.id, item.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        );
        })()}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
