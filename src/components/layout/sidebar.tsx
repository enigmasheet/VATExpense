"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "@/lib/useApp";
import { PATH_LOGIN } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { NavIcon } from "./icons";
import { getNavGroups, type NavItem } from "./nav-config";

export function SidebarLink({ href, label, icon, active, collapsed = false, onClose }: NavItem & { active: boolean; collapsed?: boolean; onClose?: () => void }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={onClose}
      className={`flex items-center rounded-md transition-colors ${
        collapsed
          ? "justify-center py-2.5"
          : "gap-3 px-3 py-2.5 text-sm font-medium"
      } ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <NavIcon name={icon} className={collapsed ? "h-5 w-5" : "h-5 w-5 shrink-0"} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

/**
 * Renders the desktop sidebar with grouped navigation, fiscal-year selection,
 * authenticated user information, and sign-out controls. Collapses to an
 * icon-only rail on demand to free up content width.
 */
export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  }) {
  const pathname = usePathname();
  const { fiscalYears, fiscalYearId, setFiscalYearId } = useApp();
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-border bg-surface transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center justify-between border-b border-border ${collapsed ? "flex-col gap-3 px-2 py-4" : "px-4 py-5"}`}>
        <Link
          href="/"
          className={`font-display font-semibold text-foreground ${collapsed ? "text-lg" : "text-xl"}`}
          title={collapsed ? "VAT Ledger" : undefined}
        >
          {collapsed ? "VL" : "VAT Ledger"}
        </Link>
        {!collapsed && (
          <p className="text-xs text-muted">Nepali fiscal-year purchase register</p>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <NavIcon name={collapsed ? "chevronRight" : "chevronLeft"} className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? "flex flex-col items-center gap-4 px-2" : "px-3"}`}>
        {getNavGroups(session?.user?.role).map((group, gi) => (
          <div key={group.title} className={collapsed ? "" : "mb-6"}>
            {!collapsed && gi > 0 && (
              <div className="mb-4 border-t border-border/50" />
            )}
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">
                {group.title}
              </p>
            )}
            <div className={`flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  {...item}
                  collapsed={collapsed}
                  active={
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(item.href + "/")
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Context */}
      <div className="border-t border-border px-4 py-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-4">
            {session?.user && (
              <>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary"
                  title={session.user.name ?? undefined}
                >
                  {userInitials}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: PATH_LOGIN })}
                  className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <NavIcon name="signOut" className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Fiscal Year Selector */}
            {fiscalYears.length > 0 && (
              <div className="mb-3">
                <label htmlFor="fiscal-year-select" className="mb-1 block text-xs text-muted">Fiscal Year</label>
                <select
                  id="fiscal-year-select"
                  value={fiscalYearId ?? ""}
                  onChange={(e) => e.target.value && setFiscalYearId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  {fiscalYears.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      {fy.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Info */}
            {session?.user && (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {session.user.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: PATH_LOGIN })}
                  aria-label="Sign out"
                  className="text-xs text-muted"
                >
                  Sign out
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
