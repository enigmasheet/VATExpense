"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { NavIcon } from "@/components/layout/icons";
import { PageHeader } from "@/components/ui/page-header";
import { FiscalYearsSection } from "@/components/admin/fiscal-years-section";
import { EmptyState } from "@/components/ui/empty-state";

interface CompanyRow {
  id: string;
  name: string;
  vatNumber: string | null;
  defaultVatRate: string;
  createdAt: string;
  userCount: number;
}

export function FiscalYearsPage() {
  const { toast } = useToast();
  const companiesApi = useApi<{ data: CompanyRow[] }>("/api/admin/companies", {
    onError: (e) => toast(e instanceof Error ? e.message : "Failed to load companies", "error"),
  });
  const companies = companiesApi.data?.data ?? [];
  const loading = companiesApi.loading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fiscal Years"
        subtitle="Manage fiscal years grouped by company"
      />

      {loading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon="fiscalYears"
          title="No companies yet"
          description="Fiscal years are created per company. Provision a company first."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {companies.map((c) => (
            <section key={c.id} className="rounded-lg border border-border bg-surface">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <NavIcon name="parties" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.vatNumber ?? "No VAT"} · created {formatDate(c.createdAt)}
                    </p>
                  </div>
                </div>
              </header>
              <div className="px-5 py-4">
                <FiscalYearsSection companyId={c.id} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}