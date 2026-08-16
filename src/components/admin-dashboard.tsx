"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { ROLE_ADMIN, VAT_RATE_DEFAULT, PATH_LOGIN } from "@/lib/constants";
import { CompanyEditModal } from "@/components/admin/company-edit-modal";
import { UserEditModal } from "@/components/admin/user-edit-modal";
import { UserCreateModal } from "@/components/admin/user-create-modal";
import { ResetPasswordModal } from "@/components/admin/reset-password-modal";
import { FiscalYearsSection } from "@/components/admin/fiscal-years-section";
import { AuditLogTab } from "@/components/admin/audit-log-tab";

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

interface AdminDashboardProps {
  resetEnabled: boolean;
}

type AdminTab = "companies" | "users" | "audit";

export function AdminDashboard({ resetEnabled }: AdminDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("companies");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
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

  // Modal states
  const [editCompany, setEditCompany] = useState<{ id: string; name: string; vatNumber: string | null; address: string | null; phone: string | null; email: string | null; defaultVatRate: string; brandName: string | null; logoUrl: string | null; primaryColor: string | null } | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "company" | "user"; id: string; name: string } | null>(null);
  const [showUserCreate, setShowUserCreate] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const loadCompanies = useCallback(() => {
    setLoading(true);
    api<{ data: CompanyRow[] }>("/api/admin/companies")
      .then(({ data }) => setCompanies(data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load companies"))
      .finally(() => setLoading(false));
  }, []);

  const loadUsers = useCallback(() => {
    setLoading(true);
    api<{ data: UserRow[] }>("/api/admin/users")
      .then(({ data }) => setUsers(data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "companies") loadCompanies();
    else if (activeTab === "users") loadUsers();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on tab change is intentional
  }, [activeTab, loadCompanies, loadUsers]);

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
              defaultVatRate: VAT_RATE_DEFAULT,
            },
            user: {
              name: adminName,
              email: adminEmail,
              password: adminPassword,
              role: ROLE_ADMIN,
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
      setError(e instanceof Error ? e.message : "Provisioning failed");
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
      setUsers([]);
      toast("Database reset complete.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "company") {
        await api(`/api/admin/companies/${deleteTarget.id}`, { method: "DELETE" });
        toast("Company deleted", "success");
        loadCompanies();
      } else {
        await api(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
        toast("User deleted", "success");
        loadUsers();
      }
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Admin</h1>
          <p className="mt-1 text-sm text-muted">Manage companies, users, and system settings</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: PATH_LOGIN })}>
          Sign out
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([["companies", `Companies (${companies.length})`], ["users", `Users (${users.length})`], ["audit", "Audit Log"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Provision form */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Provision new tenant</h2>
        <form onSubmit={handleProvision} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="company-name">
              <Input id="company-name" required placeholder="e.g. ABC Traders" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </Field>
            <Field label="VAT number (optional)" htmlFor="vat-number">
              <Input id="vat-number" placeholder="e.g. 301234567" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
            </Field>
            <Field label="Admin name" htmlFor="admin-name">
              <Input id="admin-name" required placeholder="e.g. Ram Sharma" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </Field>
            <Field label="Admin email" htmlFor="admin-email">
              <Input id="admin-email" type="email" required placeholder="admin@example.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </Field>
            <Field label="Admin password (min 8 chars)" htmlFor="admin-password">
              <Input id="admin-password" type="password" required minLength={8} placeholder="min 8 characters" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
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

      {/* Companies tab */}
      {activeTab === "companies" && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">Companies</h2>
            <Button variant="secondary" size="sm" onClick={() => setShowUserCreate(true)}>Add User</Button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-muted">Loading...</p>
          ) : companies.length === 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted">No companies provisioned yet.</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {companies.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-surface">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted">{c.vatNumber ?? "No VAT"}</span>
                      <span className="text-xs text-muted">{c.userCount} user{c.userCount !== 1 ? "s" : ""}</span>
                      <span className="text-xs text-muted">{formatDate(c.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setExpandedCompanyId(expandedCompanyId === c.id ? null : c.id)}>
                        FYs
                      </Button>
                      <Button variant="ghost" size="sm" onClick={async () => {
                        try {
                          const { data } = await api<{ data: typeof editCompany }>(`/api/admin/companies/${c.id}`);
                          setEditCompany(data);
                        } catch { toast("Failed to load company", "error"); }
                      }}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-danger" onClick={() => setDeleteTarget({ type: "company", id: c.id, name: c.name })}>Delete</Button>
                    </div>
                  </div>
                  {expandedCompanyId === c.id && (
                    <div className="border-t border-border/50 px-4 py-3">
                      <FiscalYearsSection companyId={c.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">Users</h2>
            <Button variant="secondary" size="sm" onClick={() => setShowUserCreate(true)}>Add User</Button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-muted">Loading...</p>
          ) : users.length === 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted">No users found.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-3">Name</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="px-4 py-3">Role</th>
                    <th scope="col" className="px-4 py-3">Company</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === "Admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{u.companyName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.isActive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditUser(u)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => setResetPasswordUser(u)}>Reset PW</Button>
                          <Button variant="ghost" size="sm" className="text-danger" onClick={() => setDeleteTarget({ type: "user", id: u.id, name: u.email })}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Audit Log tab */}
      {activeTab === "audit" && (
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Audit Log</h2>
          <AuditLogTab />
        </section>
      )}

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

      {error && <Alert kind="danger" className="p-3">{error}</Alert>}

      {/* Modals */}
      <CompanyEditModal open={!!editCompany} company={editCompany} onClose={() => setEditCompany(null)} onSaved={() => { setEditCompany(null); loadCompanies(); }} />
      <UserEditModal open={!!editUser} user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); loadUsers(); }} />
      <ResetPasswordModal open={!!resetPasswordUser} user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} />
      <UserCreateModal open={showUserCreate} companies={companies} onClose={() => setShowUserCreate(false)} onSaved={() => { setShowUserCreate(false); loadUsers(); }} />

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset entire database?"
        message="This will permanently delete ALL companies, users, and expenses. This action cannot be undone."
        confirmLabel="Reset"
        danger
        onConfirm={handleReset}
        onCancel={() => setResetConfirmOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type}?`}
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
