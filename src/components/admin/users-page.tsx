"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusDot } from "@/components/ui/status-dot";
import { useToast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/admin/user-avatar";
import { RoleBadge } from "@/components/admin/role-badge";
import { UserFormPanel } from "@/components/admin/user-form-panel";
import { ResetPasswordPanel } from "@/components/admin/reset-password-panel";
import { EmptyState } from "@/components/ui/empty-state";

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
  const usersApi = useApi<{ data: UserRow[] }>("/api/admin/users", {
    onError: (e) => toast(e instanceof Error ? e.message : "Failed to load users", "error"),
  });
  const companiesApi = useApi<{ data: CompanyOption[] }>("/api/admin/companies");

  const users = useMemo(() => usersApi.data?.data ?? [], [usersApi.data]);
  const companies = useMemo(() => companiesApi.data?.data ?? [], [companiesApi.data]);
  const loading = usersApi.loading;
  const loadUsers = usersApi.reload;

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

  const columns: DataColumn<UserRow>[] = [
    {
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={u.name} email={u.email} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{u.name}</p>
            <p className="truncate text-xs text-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Company",
      cell: (u) => <span className="text-muted">{u.companyName ?? "—"}</span>,
    },
    {
      header: "Role",
      cell: (u) => <RoleBadge role={u.role} />,
    },
    {
      header: "Status",
      cell: (u) => (
        <StatusDot tone={u.isActive ? "success" : "danger"} label={u.isActive ? "Active" : "Inactive"} />
      ),
    },
    {
      header: "Created",
      cell: (u) => <span className="text-xs text-muted">{formatDate(u.createdAt)}</span>,
    },
    {
      header: "Actions",
      align: "right",
      cell: (u) => (
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
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        subtitle={`${users.length} users · ${activeCount} active · ${adminCount} admins`}
        actions={<Button onClick={openCreate}>New user</Button>}
      />

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
        <DataTable
          variant="responsive"
          columns={columns}
          rows={filtered}
          getKey={(u) => u.id}
          topContent={toolbar}
          mobileCard={(u) => (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={u.name} email={u.email} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{u.name}</p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                </div>
                <RoleBadge role={u.role} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="truncate">{u.companyName ?? "—"}</span>
                <StatusDot tone={u.isActive ? "success" : "danger"} label={u.isActive ? "Active" : "Inactive"} />
              </div>
              <div className="mt-3 flex gap-1">
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
            </>
          )}
          emptyState={<div className="p-8 text-center text-sm text-muted">No users match your filters.</div>}
          bottomContent={
            <div className="border-t border-border px-4 py-3 text-xs text-muted">
              Showing {filtered.length} of {users.length} users
            </div>
          }
        />
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