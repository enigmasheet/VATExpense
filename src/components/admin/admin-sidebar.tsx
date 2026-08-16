"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { PATH_ADMIN, PATH_LOGIN } from "@/lib/constants";
import { NavIcon, type IconName } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";

const NAV_ITEMS: { href: string; label: string; icon: IconName; match?: string }[] = [
  { href: PATH_ADMIN, label: "Overview", icon: "dashboard", match: "" },
  { href: `${PATH_ADMIN}/companies`, label: "Companies", icon: "parties" },
  { href: `${PATH_ADMIN}/users`, label: "Users", icon: "management" },
  { href: `${PATH_ADMIN}/fiscal-years`, label: "Fiscal Years", icon: "fiscalYears" },
  { href: `${PATH_ADMIN}/audit-log`, label: "Audit Log", icon: "calendarDays" },
];

function isActive(href: string, match: string | undefined, pathname: string): boolean {
  if (href === PATH_ADMIN) {
    return pathname === PATH_ADMIN || (match === "" && !pathname.startsWith(PATH_ADMIN + "/"));
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <p className="font-display text-xl font-semibold text-foreground">Admin</p>
        <p className="mt-0.5 text-xs text-muted">System management</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.match, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted" onClick={() => signOut({ callbackUrl: PATH_LOGIN })}>
          <NavIcon name="signOut" className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the admin sidebar. On desktop it is fixed on the left; on mobile
 * it becomes a slide-in drawer toggled by a hamburger button.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href={PATH_ADMIN} className="font-display text-lg font-semibold text-foreground">
          Admin
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="h-full w-72 border-r border-border bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pr-3">
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}