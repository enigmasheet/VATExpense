"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { NavIcon } from "@/components/layout/icons";
import { EmptyState } from "@/components/admin/empty-state";

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
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Filters
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: AuditLogEntry[]; page: number; pageSize: number; total: number }>(
        `/api/admin/audit-log?page=${page}&pageSize=${pageSize}`,
      );
      setEntries(res.data);
      setTotal(res.total);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to load audit log", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount is intentional
    load();
  }, [load]);

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Audit Log</h1>
        <p className="mt-1 text-sm text-muted">{total} recorded activities</p>
      </div>

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
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3">Time</th>
                  <th scope="col" className="px-4 py-3">Actor</th>
                  <th scope="col" className="px-4 py-3">Action</th>
                  <th scope="col" className="px-4 py-3">Target</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-b border-border/50 last:border-b-0 hover:bg-surface-muted/50"
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted">{formatDate(new Date(e.createdAt))}</td>
                    <td className="px-4 py-3 text-xs">{e.actorEmail}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {ACTION_LABELS[e.action] ?? e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.targetName || e.targetId?.slice(0, 8) || "—"}
                      {e.targetType && <span className="ml-1 text-muted">({e.targetType})</span>}
                      {e.details && (
                        <span className="ml-1 text-muted">
                          <NavIcon name="chevronDown" className="inline h-3 w-3" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded detail */}
          {expandedId && (
            <div className="border-t border-border bg-surface-muted/50 px-4 py-3">
              {(() => {
                const e = entries.find((x) => x.id === expandedId);
                if (!e) return null;
                return (
                  <pre className="overflow-x-auto text-xs text-muted">
                    {JSON.stringify(JSON.parse(e.details ?? "null"), null, 2)}
                  </pre>
                );
              })()}
            </div>
          )}

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
        </div>
      )}
    </div>
  );
}