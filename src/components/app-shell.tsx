"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useSession, signOut } from "next-auth/react";
import { AppProvider, useApp } from "@/lib/use-app";
import { AuthProvider } from "@/lib/auth-provider";

type IconName =
  | "dashboard"
  | "quickAdd"
  | "expenses"
  | "import"
  | "monthlyReport"
  | "fyReport"
  | "parties"
  | "categories"
  | "locations"
  | "fiscalYears"
  | "chevronLeft"
  | "chevronRight"
  | "signOut"
  | "calendarDays";

const ICON_PATHS: Record<IconName, ReactNode> = {
  dashboard: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
    />
  ),
  quickAdd: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  ),
  expenses: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
    />
  ),
  import: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
  ),
  monthlyReport: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008z"
    />
  ),
  fyReport: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  ),
  parties: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
    />
  ),
  categories: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
    />
  ),
  locations: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
    />
  ),
  fiscalYears: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  ),
  chevronLeft: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  ),
  chevronRight: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  ),
  signOut: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
    />
  ),
  calendarDays: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  ),
};

function NavIcon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/expenses/new", label: "Add Expense", icon: "quickAdd" },
      { href: "/expenses", label: "Expenses", icon: "expenses" },
      { href: "/import", label: "Import", icon: "import" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports/monthly", label: "Monthly Report", icon: "monthlyReport" },
      { href: "/reports/fiscal-year", label: "FY Report", icon: "fyReport" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { href: "/parties", label: "Parties", icon: "parties" },
      { href: "/categories", label: "Categories", icon: "categories" },
      { href: "/locations", label: "Locations", icon: "locations" },
      { href: "/fiscal-years", label: "Fiscal Years", icon: "fiscalYears" },
    ],
  },
];

function SidebarLink({ href, label, icon, active, collapsed = false }: NavItem & { active: boolean; collapsed?: boolean }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
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
function Sidebar({
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
        {NAV_GROUPS.map((group, gi) => (
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
                  onClick={() => signOut({ callbackUrl: "/login" })}
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
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * Renders a read-only active fiscal-year indicator. Shown in the content area
 * when the sidebar is collapsed to its icon rail, since the selector is hidden.
 */
function ActiveFiscalYearIndicator() {
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
function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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

const SIDEBAR_KEY = "vat-ledger:sidebar-collapsed";

const sidebarListeners = new Set<() => void>();

function getCollapsedPref(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_KEY) === "1";
}

function setCollapsedPref(value: boolean) {
  localStorage.setItem(SIDEBAR_KEY, value ? "1" : "0");
  sidebarListeners.forEach((listener) => listener());
}

/**
 * Provides the collapse state for the desktop sidebar, persisted in
 * localStorage and kept hydration-safe via useSyncExternalStore.
 */
function useSidebarCollapsed() {
  return useSyncExternalStore(
    useCallback((listener: () => void) => {
      sidebarListeners.add(listener);
      return () => sidebarListeners.delete(listener);
    }, []),
    getCollapsedPref,
    () => false,
  );
}

/**
 * Provides the responsive application shell for authenticated content.
 *
 * @param children - The application content rendered in the main area
 * @returns The application shell containing navigation, content, and footer
 */
export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useSidebarCollapsed();

  return (
    <AuthProvider>
      <AppProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsedPref(!collapsed)} />
          </div>

          {/* Mobile header */}
          <MobileHeader />

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
              <div className="mx-auto max-w-6xl">
                {collapsed && <ActiveFiscalYearIndicator />}
                {children}
              </div>
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