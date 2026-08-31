"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useApp } from "@/lib/useApp";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { PartyFormModal } from "@/components/party-form-modal";
import { queryKeys } from "@/lib/query-keys";

interface PartyRow {
  id: string;
  name: string;
  normalizedName: string;
  vatNumber: string | null;
  normalizedVatNumber: string | null;
  locationId: string | null;
  locationName: string | null;
  phone: string | null;
  whatsapp: string | null;
  comment: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface LocationOption {
  id: string;
  name: string;
}

export function PartiesPage() {
  const { companyId } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: parties = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.parties(companyId ?? ""),
    queryFn: async () => {
      const res = await api<{ data: PartyRow[] }>(`/api/parties?companyId=${companyId}`);
      return res.data;
    },
    enabled: !!companyId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: queryKeys.locations(companyId ?? ""),
    queryFn: async () => {
      const res = await api<{ data: LocationOption[] }>(`/api/locations?companyId=${companyId}`);
      return res.data;
    },
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api(`/api/parties/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Party deleted.");
      queryClient.invalidateQueries({ queryKey: queryKeys.parties(companyId ?? "") });
    },
    onError: (err) => {
      toast(err instanceof ApiError ? err.detail : "Failed to delete.", "error");
    },
  });

  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<PartyRow | null>(null);
  const [quickAddName, setQuickAddName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  function openCreate() {
    setModalMode("create"); setEditTarget(null); setQuickAddName(""); setModalOpen(true);
  }

  function openEdit(party: PartyRow) {
    setModalMode("edit"); setEditTarget(party); setQuickAddName(""); setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.parties(companyId ?? "") });
    toast(modalMode === "create" ? "Party added." : "Party updated.");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  function resetFilters() {
    setSearch(""); setFilterLocation(""); setFilterStatus("");
  }

  const filtered = parties.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterLocation && p.locationId !== filterLocation) return false;
    if (filterStatus === "active" && !p.isActive) return false;
    if (filterStatus === "inactive" && p.isActive) return false;
    return true;
  });

  const activeCount = parties.filter((p) => p.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Parties"
        subtitle={`${parties.length} party${parties.length === 1 ? "" : "s"} · ${activeCount} active`}
        actions={<Button onClick={openCreate} disabled={modalOpen}>Add Party</Button>}
      />

      <form className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}>
        <Field label="Search" htmlFor="party-search">
          <Input id="party-search" placeholder="Party name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <Field label="Location" htmlFor="party-location-filter">
          <Select id="party-location-filter" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Status" htmlFor="party-status-filter">
          <Select id="party-status-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
        </div>
      </form>

      <div className="rounded-lg border border-border bg-surface">
        <DataTable
          rowClassName={() => "hover:bg-surface-subtle"}
          columns={[
            { header: "Name", cell: (p) => <span className="font-medium">{p.name}</span> },
            { header: "VAT", cell: (p) => <span className="tabular-amount">{p.vatNumber ?? "\u2013"}</span> },
            { header: "Location", cell: (p) => <span className="text-muted">{p.locationName ?? "\u2013"}</span> },
            { header: "Phone", cell: (p) => <span className="tabular-amount">{p.phone ?? "\u2013"}</span> },
            { header: "Created", cell: (p) => <span className="text-muted">{formatDate(p.createdAt)}</span> },
            { header: "Status", cell: (p) => <Badge tone={p.isActive ? "success" : "default"}>{p.isActive ? "Active" : "Inactive"}</Badge> },
            { header: "", align: "right", cell: (p) => (
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)} disabled={modalOpen}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-danger hover:text-danger"
                  onClick={() => setDeleteTarget({ id: p.id, name: p.name })}>Delete</Button>
              </div>
            )},
          ]}
          rows={filtered}
          getKey={(p) => p.id}
          emptyState={
            loading ? <div className="p-6 text-center text-sm text-muted">Loading...</div>
            : parties.length === 0 ? (
              <EmptyState icon="parties" title="No parties yet" description="Add your first supplier above."
                action={<Button size="sm" onClick={openCreate}>Add Party</Button>} />
            ) : <div className="p-6 text-center text-sm text-muted">No parties match your filters.</div>
          }
          mobileCard={(p) => (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                <Badge tone={p.isActive ? "success" : "default"}>{p.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              {p.vatNumber && <p className="text-sm text-muted">VAT: {p.vatNumber}</p>}
              {p.phone && <p className="text-sm text-muted">Phone: {p.phone}</p>}
              {p.locationName && <p className="text-sm text-muted">{p.locationName}</p>}
              <div className="mt-2 flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)} disabled={modalOpen}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-danger hover:text-danger"
                  onClick={() => setDeleteTarget({ id: p.id, name: p.name })}>Delete</Button>
              </div>
            </>
          )}
        />
      </div>

      <PartyFormModal
        open={modalOpen}
        mode={modalMode}
        initial={editTarget ? { id: editTarget.id, name: editTarget.name, vatNumber: editTarget.vatNumber, locationId: editTarget.locationId, phone: editTarget.phone, whatsapp: editTarget.whatsapp, comment: editTarget.comment } : undefined}
        initialName={quickAddName}
        onSaved={handleSaved}
        onCancel={() => setModalOpen(false)}
      />

      <ConfirmDialog open={deleteTarget !== null} title={`Delete "${deleteTarget?.name}"?`}
        message="This will permanently remove the party. Expenses referencing it will keep their party name."
        confirmLabel="Delete" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
