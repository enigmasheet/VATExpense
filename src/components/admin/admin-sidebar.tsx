"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { PATH_ADMIN, PATH_LOGIN } from "@/lib/constants";
import { NavIcon, type IconName } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";
import { navItemClasses, navGroupLabelClasses, NAV_ACCENT_BAR } from "@/components/layout/nav-styles";

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

function SidebarContent({ pathname, onNavigate, onClose }: { pathname: string; onNavigate?: () => void; onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-5">
        <div>
          <p className="font-display text-xl font-semibold text-foreground">Admin</p>
          <p className="mt-0.5 text-xs text-muted/80">System management</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div>
          <p className={navGroupLabelClasses()}>Management</p>
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.match, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={navItemClasses(active)}
                >
                  {active && (
                    <span className={NAV_ACCENT_BAR} aria-hidden="true" />
                  )}
                  <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-border/70 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
        >
          <NavIcon name="chevronLeft" className="h-4 w-4 shrink-0" />
          <span>Back to app</span>
        </Link>
        <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-muted" onClick={() => signOut({ callbackUrl: PATH_LOGIN })}>
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
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Close the drawer when the route changes.
  useEffect(() => {
    const id = window.setTimeout(() => setMobileOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  // Lock body scroll and move focus into the drawer while open; restore on close.
  useEffect(() => {
    if (mobileOpen) {
      wasOpen.current = true;
      const first = drawerRef.current?.querySelector<HTMLElement>("a, button");
      first?.focus();
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      openButtonRef.current?.focus();
    }
    document.body.style.overflow = "";
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href={PATH_ADMIN} className="font-display text-lg font-semibold text-foreground">
          Admin
        </Link>
        <button
          ref={openButtonRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-surface lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile slide-in drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 animate-[backdrop-in_200ms_ease-out]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation menu"
            className="fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-xs flex-col bg-surface shadow-2xl animate-[drawer-in_250ms_ease-out]"
            onKeyDown={(e) => {
              if (e.key === "Escape") setMobileOpen(false);
            }}
          >
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
