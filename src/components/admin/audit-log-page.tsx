"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusDot } from "@/components/ui/status-dot";
import { useToast } from "@/components/ui/toast";
import { NavIcon } from "@/components/layout/icons";
import { EmptyState } from "@/components/ui/empty-state";

interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  provision_company: "Provisioned company",
  update_company: "Updated company",
  delete_company: "Deleted company",
  create_user: "Created user",
  update_user: "Updated user",
  delete_user: "Deleted user",
  reset_password: "Reset password",
  create_fiscal_year: "Created fiscal year",
  update_fiscal_year: "Updated fiscal year",
  delete_fiscal_year: "Deleted fiscal year",
  reset_database: "Reset database",
};

const TARGET_TYPES = ["user", "company", "fiscal_year"];

export function AuditLogPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filters
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const auditApi = useApi<{ data: AuditLogEntry[]; page: number; pageSize: number; total: number }>(
    `/api/admin/audit-log?page=${page}&pageSize=${pageSize}`,
    {
      onError: (e) => toast(e instanceof Error ? e.message : "Failed to load audit log", "error"),
    },
  );

  const entries = auditApi.data?.data ?? [];
  const total = auditApi.data?.total ?? 0;
  const loading = auditApi.loading;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (targetFilter !== "all" && e.targetType !== targetFilter) return false;
      if (q && !`${e.actorEmail} ${e.targetName ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, query, actionFilter, targetFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toolbar = (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
      <input
        type="search"
        placeholder="Search actor or target..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-primary"
      />
      <select
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
      >
        <option value="all">All actions</option>
        {Object.entries(ACTION_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={targetFilter}
        onChange={(e) => setTargetFilter(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
      >
        <option value="all">All targets</option>
        {TARGET_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );

  const columns: DataColumn<AuditLogEntry>[] = [
    {
      header: "Time",
      cell: (e) => (
        <span className="text-xs whitespace-nowrap text-muted">{formatDate(new Date(e.createdAt))}</span>
      ),
    },
    {
      header: "Actor",
      cell: (e) => <span className="text-xs">{e.actorEmail}</span>,
    },
    {
      header: "Action",
      cell: (e) => <StatusDot tone="default" label={ACTION_LABELS[e.action] ?? e.action} />,
    },
    {
      header: "Target",
      cell: (e) => (
        <span className="text-xs">
          {e.targetName || e.targetId?.slice(0, 8) || "—"}
          {e.targetType && <span className="ml-1 text-muted">({e.targetType})</span>}
          {e.details && (
            <span className="ml-1 text-muted">
              <NavIcon name="chevronDown" className="inline h-3 w-3" />
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit Log" subtitle={`${total} recorded activities`} />

      {loading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          Loading audit log...
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="calendarDays"
          title="No audit entries yet"
          description="Administrative actions will appear here as they happen."
        />
      ) : (
        <DataTable
          variant="desktop-only"
          columns={columns}
          rows={filtered}
          getKey={(e) => e.id}
          rowClassName={() => "hover:bg-surface-muted/50"}
          onRowClick={(e) => setExpandedId(expandedId === e.id ? null : e.id)}
          expandedRow={(e) =>
            e.id === expandedId ? (
              <pre className="overflow-x-auto text-xs text-muted">
                {JSON.stringify(JSON.parse(e.details ?? "null"), null, 2)}
              </pre>
            ) : null
          }
          topContent={toolbar}
          emptyState={<div className="p-8 text-center text-sm text-muted">No entries match your filters.</div>}
          bottomContent={
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {filtered.length} of {total} entries{filtered.length !== entries.length ? " (filtered)" : ""}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}