"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "@/lib/useApp";
import { PATH_LOGIN } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/admin/user-avatar";
import { NavIcon } from "./icons";
import { getNavGroups, type NavItem } from "./nav-config";

function isItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function isChildActive(href: string, pathname: string): boolean {
  return pathname === href;
}

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

function SidebarSubmenu({ item, pathname, collapsed, onClose }: { item: NavItem; pathname: string; collapsed: boolean; onClose?: () => void }) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isItemActive(item.href, pathname);
  const isExpanded = hasChildren && (isActive || item.children?.some((child) => isChildActive(child.href, pathname)));
  const [open, setOpen] = useState(isExpanded);

  if (collapsed || !hasChildren) {
    return <SidebarLink {...item} active={isActive} collapsed={collapsed} onClose={onClose} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <NavIcon name={open ? "chevronDown" : "chevronRight"} className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border/50 pl-3">
          {item.children!.map((child) => (
            <SidebarLink
              key={child.href}
              {...child}
              active={isChildActive(child.href, pathname)}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
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
  const router = useRouter();
  const { fiscalYears, fiscalYearId, setActiveFiscalYear, activeCompany } = useApp();
  const { data: session } = useSession();

  const displayName = activeCompany?.brandName || activeCompany?.name || "VAT Ledger";

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
          title={collapsed ? displayName : undefined}
        >
          {collapsed ? (displayName.length > 2 ? displayName.slice(0, 2).toUpperCase() : displayName) : displayName}
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
                <SidebarSubmenu
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
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
                <span title={session.user.name ?? undefined}>
                  <UserAvatar name={session.user.name} email={session.user.email} shape="rounded" />
                </span>
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
                  onChange={async (e) => {
                    if (!e.target.value) return;
                    await setActiveFiscalYear(e.target.value);
                    router.refresh();
                  }}
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
