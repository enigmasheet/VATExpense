"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/use-app";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

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

  const refresh = useCallback(() => {
    if (!companyId) return;
    api<{ data: T[] }>(`${listUrl}?companyId=${companyId}`)
      .then(({ data }) => setItems(data))
      .catch((e: ApiError) => setError(e.detail));
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

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted">{emptyHint}</p>
        ) : (
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
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  {columns.map((col) => (
                    <td key={col.header} className="px-4 py-3 text-muted">
                      {col.render(item)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <Badge tone={item.isActive ? "success" : "default"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}