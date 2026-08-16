"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { NavIcon } from "@/components/layout/icons";
import { EmptyState } from "@/components/admin/empty-state";
import { ProvisionPanel } from "@/components/admin/provision-panel";
import { CompanyEditPanel } from "@/components/admin/company-edit-panel";

interface CompanyRow {
  id: string;
  name: string;
  vatNumber: string | null;
  defaultVatRate: string;
  createdAt: string;
  userCount: number;
}

interface CompanyDetail extends CompanyRow {
  address: string | null;
  phone: string | null;
  email: string | null;
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

export function CompaniesPage() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<CompanyDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api<{ data: CompanyRow[] }>("/api/admin/companies");
      setCompanies(data);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to load companies", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount is intentional
    loadCompanies();
  }, [loadCompanies]);

  async function openEdit(company: CompanyRow) {
    try {
      const { data } = await api<{ data: CompanyDetail }>(`/api/admin/companies/${company.id}`);
      setEditCompany(data);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to load company", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/admin/companies/${deleteTarget.id}`, { method: "DELETE" });
      toast("Company deleted", "success");
      loadCompanies();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to delete company", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Companies</h1>
          <p className="mt-1 text-sm text-muted">{companies.length} companies provisioned</p>
        </div>
        <Button onClick={() => setProvisionOpen(true)}>New company</Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon="parties"
          title="No companies yet"
          description="Provision your first company to get started."
          action={<Button onClick={() => setProvisionOpen(true)}>Provision company</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold text-foreground">{c.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">{c.vatNumber ?? "No VAT number"}</p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
                    VAT {c.defaultVatRate}%
                  </span>
                </div>
                <dl className="mt-4 flex items-center gap-4 text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <NavIcon name="management" className="h-4 w-4" />
                    <span>{c.userCount} user{c.userCount !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <NavIcon name="calendarDays" className="h-4 w-4" />
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                </dl>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProvisionPanel open={provisionOpen} onClose={() => setProvisionOpen(false)} onSaved={loadCompanies} />
      <CompanyEditPanel open={!!editCompany} company={editCompany} onClose={() => setEditCompany(null)} onSaved={loadCompanies} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete company?"
        message={`Deleting "${deleteTarget?.name}" permanently removes the company and all of its users, fiscal years, parties, and expenses. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}