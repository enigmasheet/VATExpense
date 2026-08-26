"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { SubmitEvent } from "react";
import { useApp } from "@/lib/useApp";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { SlideOver } from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";

interface TruckDocument {
  id: string;
  documentType: string;
  documentNumber: string | null;
  expiryDate: string | null;
  reminderDate: string | null;
  isActive: boolean;
}

/**
 * Renders the document register for a single truck: type, number, BS expiry
 * and reminder dates, with add/edit/delete via a slide-over form.
 */
export function TruckDocumentsPage({
  truckId,
  truckName,
}: {
  truckId: string;
  truckName: string;
}) {
  const { companyId } = useApp();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<TruckDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<TruckDocument | null>(null);

  const refresh = useCallback(() => {
    if (!companyId) return;
    api<{ data: TruckDocument[] }>(
      `/api/truck-documents?companyId=${companyId}&truckId=${truckId}`,
    )
      .then(({ data }) => setDocuments(data))
      .catch((e: ApiError) => setError(e.detail))
      .finally(() => setLoading(false));
  }, [companyId, truckId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setDocumentType("");
    setDocumentNumber("");
    setExpiryDate("");
    setReminderDate("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(doc: TruckDocument) {
    setFormMode("edit");
    setEditingId(doc.id);
    setDocumentType(doc.documentType);
    setDocumentNumber(doc.documentNumber ?? "");
    setExpiryDate(doc.expiryDate ?? "");
    setReminderDate(doc.reminderDate ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (formMode === "create") {
        await api("/api/truck-documents", {
          method: "POST",
          body: JSON.stringify({
            truckId,
            documentType: documentType.trim(),
            documentNumber: documentNumber.trim() || null,
            expiryDate: expiryDate.trim() || null,
            reminderDate: reminderDate.trim() || null,
          }),
        });
        toast("Document added.");
      } else {
        await api(`/api/truck-documents/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            documentType: documentType.trim(),
            documentNumber: documentNumber.trim() || null,
            expiryDate: expiryDate.trim() || null,
            reminderDate: reminderDate.trim() || null,
          }),
        });
        toast("Updated.");
      }
      setFormOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !companyId) return;
    try {
      await api(`/api/truck-documents/${deleteTarget.id}`, { method: "DELETE" });
      toast("Deleted.");
      refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Failed to delete", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  const columns: DataColumn<TruckDocument>[] = [
    { header: "Type", cell: (d) => <span className="font-medium">{d.documentType}</span> },
    { header: "Number", cell: (d) => d.documentNumber ?? "—" },
    { header: "Expiry date", cell: (d) => d.expiryDate ?? "—" },
    { header: "Reminder date", cell: (d) => d.reminderDate ?? "—" },
    {
      header: "Status",
      cell: (d) => (
        <Badge tone={d.isActive ? "success" : "default"}>
          {d.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      align: "right",
      cell: (d) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() => setDeleteTarget(d)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Documents — ${truckName}`}
        subtitle="Registration papers, insurance policies and other documents with expiry reminders."
        actions={
          <>
            <Link href="/trucks">
              <Button variant="ghost">Back to trucks</Button>
            </Link>
            <Button onClick={openCreate} disabled={!companyId || formOpen}>
              Add Document
            </Button>
          </>
        }
      />

      {error && <Alert kind="danger">{error}</Alert>}

      <DataTable<TruckDocument>
        emptyState={
          loading ? (
            <div className="p-6 text-center text-sm text-muted" role="status">Loading...</div>
          ) : (
            <p className="p-6 text-sm text-muted">No documents yet. Add one to track its expiry.</p>
          )
        }
        columns={columns}
        rows={documents}
        getKey={(d) => d.id}
        mobileCard={(d) => (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{d.documentType}</span>
              <Badge tone={d.isActive ? "success" : "default"}>
                {d.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="text-sm text-muted">
              {d.documentNumber && <p>Number: {d.documentNumber}</p>}
              {d.expiryDate && <p>Expires: {d.expiryDate}</p>}
              {d.reminderDate && <p>Remind on: {d.reminderDate}</p>}
            </div>
            <div className="mt-3 flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger"
                onClick={() => setDeleteTarget(d)}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      />

      <SlideOver
        open={formOpen}
        title={formMode === "create" ? "Add Document" : `Edit "${documentType}"`}
        onClose={() => {
          if (submitting) return;
          setFormOpen(false);
        }}
        closeOnEscape={!submitting}
        closeOnOverlayClick={!submitting}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="truck-document-form" size="sm" loading={submitting} disabled={!companyId}>
              {submitting ? "Saving..." : formMode === "create" ? "Add" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="truck-document-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Document type" htmlFor="td-type" hint="e.g. Blue Book, Insurance, Tax Receipt">
            <Input
              id="td-type"
              required
              placeholder="e.g. Insurance"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            />
          </Field>
          <Field label="Document number" htmlFor="td-number">
            <Input
              id="td-number"
              placeholder="Optional"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </Field>
          <Field label="Expiry date (BS)" htmlFor="td-expiry" hint="YYYY-MM-DD">
            <Input
              id="td-expiry"
              placeholder="e.g. 2083-03-15"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </Field>
          <Field label="Reminder date (BS)" htmlFor="td-reminder" hint="When you want to be reminded">
            <Input
              id="td-reminder"
              placeholder="e.g. 2083-02-15"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
            />
          </Field>
          {formError && <Alert kind="danger">{formError}</Alert>}
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.documentType ?? ""}"?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
