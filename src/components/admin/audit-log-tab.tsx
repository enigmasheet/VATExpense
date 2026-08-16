"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  createdAt: string;
}

interface Props {
  pageSize?: number;
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

export function AuditLogTab({ pageSize = 50 }: Props) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: AuditLogEntry[]; page: number; pageSize: number; total: number }>(
        `/api/admin/audit-log?page=${page}&pageSize=${pageSize}`,
      );
      setEntries(res.data);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount is intentional
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) {
    return <p className="text-sm text-muted py-4">Loading audit log...</p>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted py-4">No audit entries yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border/50">
                <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">{formatDate(new Date(e.createdAt))}</td>
                <td className="px-3 py-2 text-xs">{e.actorEmail}</td>
                <td className="px-3 py-2 text-xs">{ACTION_LABELS[e.action] ?? e.action}</td>
                <td className="px-3 py-2 text-xs">
                  {e.targetName || e.targetId?.slice(0, 8) || "—"}
                  {e.details && (
                    <span className="ml-1 text-muted">
                      ({e.targetType})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Page {page} of {totalPages} ({total} entries)</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
