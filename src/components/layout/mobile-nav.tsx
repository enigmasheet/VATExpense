"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "@/lib/use-app";
import { PATH_LOGIN } from "@/lib/constants";
import { NavIcon } from "./icons";
import { getNavGroups } from "./nav-config";
import { SidebarLink } from "./sidebar";

/**
 * Renders a read-only active fiscal-year indicator. Shown in the content area
 * when the sidebar is collapsed to its icon rail, since the selector is hidden.
 */
export function ActiveFiscalYearIndicator() {
  const { activeFiscalYear } = useApp();
  if (!activeFiscalYear) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-surface px-3 py-2">
      <span className="flex items-center gap-2 text-xs font-medium text-muted">
        <NavIcon name="calendarDays" className="h-4 w-4 text-primary" />
        Active fiscal year
      </span>
      <span className="text-sm font-semibold text-foreground">{activeFiscalYear.name}</span>
    </div>
  );
}

/**
 * Renders the responsive mobile header and navigation menu.
 *
 * The menu closes when the current route changes or the overlay is clicked.
 */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change. Run asynchronously to avoid synchronous setState in effect.
  useEffect(() => {
    const id = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  // Lock body scroll when the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-1 text-foreground hover:bg-surface-hover"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <Link href="/" className="font-display text-lg font-semibold text-foreground">
          VAT Ledger
        </Link>
      </header>

      {/* Mobile overlay menu */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          <div className="fixed inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <MobileNavPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

function MobileNavPanel({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { fiscalYears, fiscalYearId, setFiscalYearId } = useApp();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const firstFocusable = panel.querySelector<HTMLElement>("a, button, select, input");
    firstFocusable?.focus();
  }, []);

  const trapFocus = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        "a, button, select, input, [tabindex]:not([tabindex='-1'])"
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    []
  );

  return (
    <div
      ref={panelRef}
      className="fixed inset-y-0 left-0 w-72 bg-surface shadow-xl"
      onKeyDown={trapFocus}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-4 py-5">
          <Link href="/" className="font-display text-xl font-semibold text-foreground" onClick={onClose}>
            VAT Ledger
          </Link>
          <p className="mt-0.5 text-xs text-muted">Nepali fiscal-year purchase register</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {getNavGroups(session?.user?.role).map((group) => (
            <div key={group.title} className="mb-6">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">
                {group.title}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    {...item}
                    active={
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href
                    }
                    onClose={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-4">
          {fiscalYears.length > 0 && (
            <div className="mb-3">
              <label className="mb-1 block text-xs text-muted">Fiscal Year</label>
              <select
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
          {session?.user && (
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-medium text-foreground">
                {session.user.name}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: PATH_LOGIN })}
                className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-foreground"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
