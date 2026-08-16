"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NavIcon } from "@/components/layout/icons";
import { ROLE_ADMIN, ROLE_DATA_ENTRY } from "@/lib/constants";

interface CompanyRow {
  id: string;
  name: string;
  vatNumber: string | null;
  defaultVatRate: string;
  createdAt: string;
  userCount: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  companyId: string;
  companyName: string | null;
  createdAt: string;
}

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

export function AdminOverview() {
  const companiesApi = useApi<{ data: CompanyRow[] }>("/api/admin/companies");
  const usersApi = useApi<{ data: UserRow[] }>("/api/admin/users");
  const recentApi = useApi<{ data: AuditLogEntry[] }>("/api/admin/audit-log?page=1&pageSize=8");

  const companies = companiesApi.data?.data ?? [];
  const users = usersApi.data?.data ?? [];
  const recent = recentApi.data?.data ?? [];
  const loading = companiesApi.loading || usersApi.loading || recentApi.loading;

  const admins = users.filter((u) => u.role === ROLE_ADMIN).length;
  const dataEntry = users.filter((u) => u.role === ROLE_DATA_ENTRY).length;

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
        Loading overview...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Admin Overview" subtitle="System-wide snapshot" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={companies.length} />
        <StatCard label="Users" value={users.length} />
        <StatCard label="Admins" value={admins} />
        <StatCard label="Data Entry" value={dataEntry} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent companies */}
        <section className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Recent companies</h2>
            <Link href="/admin/companies">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
          <ul className="divide-y divide-border/50">
            {companies.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <NavIcon name="parties" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted">{c.userCount} users</p>
                  </div>
                </div>
                <span className="text-xs text-muted">{formatDate(c.createdAt)}</span>
              </li>
            ))}
            {companies.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">No companies yet.</li>
            )}
          </ul>
        </section>

        {/* Recent activity */}
        <section className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Recent activity</h2>
            <Link href="/admin/audit-log">
              <Button variant="ghost" size="sm">View log</Button>
            </Link>
          </div>
          <ul className="divide-y divide-border/50">
            {recent.map((e) => (
              <li key={e.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ACTION_LABELS[e.action] ?? e.action}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {e.actorEmail} · {e.targetName || e.targetId?.slice(0, 8) || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{formatDate(new Date(e.createdAt))}</span>
                </div>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">No activity yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}