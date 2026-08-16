"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface FiscalYearData {
  id: string;
  companyId: string;
  name: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  companyId: string;
}

export function FiscalYearsSection({ companyId }: Props) {
  const { toast } = useToast();
  const fiscalYearsApi = useApi<{ data: FiscalYearData[] }>(
    `/api/admin/companies/${companyId}/fiscal-years`,
    { onError: () => toast("Failed to load fiscal years", "error") },
  );
  const fiscalYears = fiscalYearsApi.data?.data ?? [];
  const loading = fiscalYearsApi.loading;
  const loadFiscalYears = fiscalYearsApi.reload;

  const [showForm, setShowForm] = useState(false);
  const [fyName, setFyName] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/admin/companies/${companyId}/fiscal-years`, {
        method: "POST",
        body: JSON.stringify({
          name: fyName,
          startYear: Number(startYear),
          endYear: Number(endYear),
          companyId,
          isActive,
        }),
      });
      toast("Fiscal year created", "success");
      setFyName("");
      setStartYear("");
      setEndYear("");
      setIsActive(false);
      setShowForm(false);
      loadFiscalYears();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to create fiscal year", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(fy: FiscalYearData) {
    if (!confirm(`Delete fiscal year "${fy.name}"?`)) return;
    try {
      await api(`/api/admin/fiscal-years/${fy.id}`, { method: "DELETE" });
      toast("Fiscal year deleted", "success");
      loadFiscalYears();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to delete", "error");
    }
  }

  async function handleToggleActive(fy: FiscalYearData) {
    try {
      await api(`/api/admin/fiscal-years/${fy.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !fy.isActive }),
      });
      toast(`Fiscal year ${fy.isActive ? "deactivated" : "activated"}`, "success");
      loadFiscalYears();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to update", "error");
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-muted">Fiscal Years</h4>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add FY"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex flex-col gap-2 p-3 rounded border border-border/50 bg-background mb-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Name" htmlFor="fy-name">
              <Input id="fy-name" required value={fyName} onChange={(e) => setFyName(e.target.value)} placeholder="2084-2085" />
            </Field>
            <Field label="Start Year" htmlFor="fy-start">
              <Input id="fy-start" type="number" required value={startYear} onChange={(e) => setStartYear(e.target.value)} />
            </Field>
            <Field label="End Year" htmlFor="fy-end">
              <Input id="fy-end" type="number" required value={endYear} onChange={(e) => setEndYear(e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Set as active
          </label>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-muted">Loading...</p>
      ) : fiscalYears.length === 0 ? (
        <p className="text-xs text-muted">No fiscal years</p>
      ) : (
        <div className="flex flex-col gap-1">
          {fiscalYears.map((fy) => (
            <div key={fy.id} className="flex items-center justify-between rounded border border-border/50 px-3 py-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-medium">{fy.name}</span>
                <span className="text-muted text-xs">{fy.startYear}-{fy.endYear}</span>
                {fy.isActive && <Badge tone="success">Active</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleToggleActive(fy)}>
                  {fy.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(fy)} className="text-danger">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
