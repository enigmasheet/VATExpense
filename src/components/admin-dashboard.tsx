"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface CompanyRow {
  id: string;
  name: string;
  vatNumber: string | null;
  defaultVatRate: string;
  createdAt: string;
  userCount: number;
}

interface AdminDashboardProps {
  resetEnabled: boolean;
}

/**
 * Superadmin dashboard: lists all companies, provisions new tenants, and provides DB reset.
 */
export function AdminDashboard({ resetEnabled }: AdminDashboardProps) {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Provision form state
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{ companyId: string; fiscalYearName: string } | null>(null);

  // Reset state
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadCompanies = useCallback(() => {
    api<{ data: CompanyRow[] }>("/api/admin/companies")
      .then(({ data }) => setCompanies(data))
      .catch((e) => setError(e.detail))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  async function handleProvision(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProvisionResult(null);
    setProvisioning(true);
    try {
      const result = await api<{ data: { companyId: string; fiscalYearName: string } }>(
        "/api/admin/companies",
        {
          method: "POST",
          body: JSON.stringify({
            company: {
              name: companyName,
              vatNumber: vatNumber || null,
              defaultVatRate: "13.00",
            },
            user: {
              name: adminName,
              email: adminEmail,
              password: adminPassword,
              role: "Admin",
            },
          }),
        },
      );
      setProvisionResult(result.data);
      setCompanyName("");
      setVatNumber("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      loadCompanies();
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : "Provisioning failed";
      setError(detail);
    } finally {
      setProvisioning(false);
    }
  }

  async function handleReset() {
    setResetConfirmOpen(false);
    setResetting(true);
    setError(null);
    try {
      await api("/api/admin/reset", { method: "POST" });
      setCompanies([]);
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : "Reset failed";
      setError(detail);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Admin</h1>
          <p className="mt-1 text-sm text-muted">Manage companies and tenants</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
      </div>

      {/* Provision form */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Provision new tenant</h2>
        <form onSubmit={handleProvision} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="company-name">
              <Input
                id="company-name"
                required
                placeholder="e.g. ABC Traders"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </Field>
            <Field label="VAT number (optional)" htmlFor="vat-number">
              <Input
                id="vat-number"
                placeholder="e.g. 301234567"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
              />
            </Field>
            <Field label="Admin name" htmlFor="admin-name">
              <Input
                id="admin-name"
                required
                placeholder="e.g. Ram Sharma"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
              />
            </Field>
            <Field label="Admin email" htmlFor="admin-email">
              <Input
                id="admin-email"
                type="email"
                required
                placeholder="admin@example.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </Field>
            <Field label="Admin password (min 8 chars)" htmlFor="admin-password">
              <Input
                id="admin-password"
                type="password"
                required
                minLength={8}
                placeholder="min 8 characters"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={provisioning}>
              {provisioning ? "Provisioning..." : "Create company + admin"}
            </Button>
            {provisionResult && (
              <span className="text-sm text-success">
                Created {provisionResult.fiscalYearName} company. ID: {provisionResult.companyId.slice(0, 8)}...
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Companies list */}
      <section>
        <h2 className="font-display text-lg font-semibold text-foreground">Companies</h2>
        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading...</p>
        ) : companies.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No companies provisioned yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">VAT</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted">{c.vatNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-amount">{c.userCount}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="rounded-lg border border-danger/30 bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-danger">Danger zone</h2>
        <p className="mt-2 text-sm text-muted">
          Reset wipes all data permanently. This requires <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">ALLOW_DB_RESET=true</code> in your environment.
        </p>
        <Button
          variant="danger"
          size="sm"
          className="mt-4"
          disabled={!resetEnabled || resetting}
          onClick={() => setResetConfirmOpen(true)}
        >
          {resetting ? "Resetting..." : "Reset database"}
        </Button>
        {!resetEnabled && (
          <p className="mt-2 text-xs text-muted">
            Set ALLOW_DB_RESET=true to enable this button.
          </p>
        )}
      </section>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset entire database?"
        message="This will permanently delete ALL companies, users, and expenses. This action cannot be undone."
        confirmLabel="Reset"
        danger
        onConfirm={handleReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
