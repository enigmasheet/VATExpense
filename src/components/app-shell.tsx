"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { AppProvider, useApp } from "@/lib/use-app";
import { AuthProvider } from "@/lib/auth-provider";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: "📊" },
      { href: "/expenses/new", label: "Quick Add", icon: "⚡" },
      { href: "/expenses", label: "Expenses", icon: "📋" },
      { href: "/import", label: "Import", icon: "📥" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports/monthly", label: "Monthly Report", icon: "📅" },
      { href: "/reports/fiscal-year", label: "FY Report", icon: "📈" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { href: "/parties", label: "Parties", icon: "🏢" },
      { href: "/categories", label: "Categories", icon: "🏷️" },
      { href: "/locations", label: "Locations", icon: "📍" },
      { href: "/fiscal-years", label: "Fiscal Years", icon: "📆" },
    ],
  },
];

function SidebarLink({ href, label, icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

/**
 * Renders the desktop sidebar with grouped navigation, fiscal-year selection, authenticated user information, and sign-out controls.
 */
function Sidebar() {
  const pathname = usePathname();
  const { fiscalYears, fiscalYearId, setFiscalYearId } = useApp();
  const { data: session } = useSession();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="border-b border-border px-4 py-5">
        <Link href="/" className="font-display text-xl font-semibold text-foreground">
          VAT Ledger
        </Link>
        <p className="mt-0.5 text-xs text-muted">Nepali fiscal-year purchase register</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
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
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Context */}
      <div className="border-t border-border px-4 py-4">
        {/* Fiscal Year Selector */}
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

        {/* User Info */}
        {session?.user && (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {session.user.name}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * Renders the responsive mobile header and navigation menu.
 *
 * The menu closes when the current route changes or the overlay is clicked.
 */
function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { fiscalYears, fiscalYearId, setFiscalYearId } = useApp();
  const { data: session } = useSession();

    // Close menu on route change. Run asynchronously to avoid synchronous setState in effect.
    useEffect(() => {
      const id = window.setTimeout(() => setOpen(false), 0);
      return () => window.clearTimeout(id);
    }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-1 text-foreground hover:bg-surface-hover"
          aria-label="Toggle menu"
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
          {NAV_GROUPS.map((group) => (
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
                onClick={() => signOut({ callbackUrl: "/login" })}
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

/**
 * Provides the responsive application shell for authenticated content.
 *
 * @param children - The application content rendered in the main area
 * @returns The application shell containing navigation, content, and footer
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            <Sidebar />
          </div>

          {/* Mobile header */}
          <MobileHeader />

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
            <footer className="border-t border-border py-3 text-center text-xs text-muted">
              VAT Expense Ledger · Nepali fiscal-year purchase register
            </footer>
          </div>
        </div>
      </AppProvider>
    </AuthProvider>
  );
}
