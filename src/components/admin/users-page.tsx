"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/admin/user-avatar";
import { RoleBadge } from "@/components/admin/role-badge";
import { UserFormPanel } from "@/components/admin/user-form-panel";
import { ResetPasswordPanel } from "@/components/admin/reset-password-panel";
import { EmptyState } from "@/components/admin/empty-state";

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

interface CompanyOption {
  id: string;
  name: string;
}

export function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Panel states
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api<{ data: UserRow[] }>("/api/admin/users");
      setUsers(data);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadCompanies = useCallback(async () => {
    try {
      const { data } = await api<{ data: CompanyOption[] }>("/api/admin/companies");
      setCompanies(data);
    } catch {
      // silent — company dropdown is secondary
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount is intentional
    loadUsers();
    loadCompanies();
  }, [loadUsers, loadCompanies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (companyFilter !== "all" && u.companyId !== companyFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, query, roleFilter, companyFilter, statusFilter]);

  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);
  const adminCount = useMemo(() => users.filter((u) => u.role === "Admin").length, [users]);

  function openCreate() {
    setFormMode("create");
    setEditingUser(null);
    setFormOpen(true);
  }

  function openEdit(user: UserRow) {
    setFormMode("edit");
    setEditingUser(user);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      toast("User deleted", "success");
      loadUsers();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to delete user", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const toolbar = (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Search name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-primary"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="all">All roles</option>
          <option value="Admin">Admin</option>
          <option value="DataEntry">Data Entry</option>
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="all">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted">
            {users.length} users · {activeCount} active · {adminCount} admins
          </p>
        </div>
        <Button onClick={openCreate}>New user</Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon="management"
          title="No users yet"
          description="Create your first user to start managing access."
          action={<Button onClick={openCreate}>Create user</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {toolbar}
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              No users match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-3">User</th>
                    <th scope="col" className="px-4 py-3">Company</th>
                    <th scope="col" className="px-4 py-3">Role</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Created</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} email={u.email} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{u.name}</p>
                            <p className="truncate text-xs text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{u.companyName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            u.isActive ? "text-success" : "text-danger"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-success" : "bg-danger"}`}
                          />
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setResetUser(u)}>
                            Reset PW
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger"
                            onClick={() => setDeleteTarget(u)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-border px-4 py-3 text-xs text-muted">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      )}

      <UserFormPanel
        mode={formMode}
        open={formOpen}
        user={editingUser}
        companies={companies}
        onClose={() => setFormOpen(false)}
        onSaved={loadUsers}
      />
      <ResetPasswordPanel open={!!resetUser} user={resetUser} onClose={() => setResetUser(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user?"
        message={`Are you sure you want to delete ${deleteTarget?.email ?? "this user"}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}