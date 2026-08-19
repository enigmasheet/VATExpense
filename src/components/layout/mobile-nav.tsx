"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "@/lib/useApp";
import { PATH_LOGIN } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { NavSelect } from "@/components/ui/nav-select";
import { UserAvatar } from "@/components/admin/user-avatar";
import { NavIcon } from "./icons";
import { getNavGroups, type NavItem } from "./nav-config";
import { SidebarLink } from "./sidebar";
import { navItemClasses, navGroupLabelClasses, NAV_ACCENT_BAR } from "./nav-styles";

function isItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function isChildActive(href: string, pathname: string): boolean {
  return pathname === href;
}

function MobileSubmenu({ item, pathname, onClose }: { item: NavItem; pathname: string; onClose: () => void }) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isItemActive(item.href, pathname);
  const isExpanded = hasChildren && (isActive || item.children?.some((child) => isChildActive(child.href, pathname)));
  const [open, setOpen] = useState(isExpanded);

  if (!hasChildren) {
    return <SidebarLink {...item} active={isActive} onClose={onClose} accent />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={navItemClasses(isActive)}
      >
        {isActive && (
          <span className={NAV_ACCENT_BAR} aria-hidden="true" />
        )}
        <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <NavIcon name={open ? "chevronDown" : "chevronRight"} className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border/40 pl-3">
          {item.children!.map((child) => (
            <SidebarLink
              key={child.href}
              {...child}
              active={isChildActive(child.href, pathname)}
              onClose={onClose}
              accent
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
 * Renders the responsive mobile header and slide-in navigation drawer.
 *
 * The drawer closes when the current route changes, Escape is pressed, the
 * close button is activated, or the backdrop is clicked.
 */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { activeCompany } = useApp();

  const displayName = activeCompany?.brandName || activeCompany?.name || "VAT Ledger";

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
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="min-w-0 truncate font-display text-lg font-semibold text-foreground">
          {displayName}
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </header>

      {open && <MobileDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { fiscalYears, fiscalYearId, setActiveFiscalYear, activeCompany } = useApp();
  const drawerRef = useRef<HTMLDivElement>(null);

  const displayName = activeCompany?.brandName || activeCompany?.name || "VAT Ledger";

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    const firstFocusable = drawer.querySelector<HTMLElement>("a, button, select, input");
    firstFocusable?.focus();
  }, []);

  const trapFocus = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 animate-[backdrop-in_200ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-xs flex-col bg-surface shadow-2xl animate-[drawer-in_250ms_ease-out]"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose();
            return;
          }
          trapFocus(e);
        }}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-5">
          <div>
            <Link href="/" className="font-display text-xl font-semibold text-foreground" onClick={onClose}>
              {displayName}
            </Link>
            <p className="mt-0.5 text-xs text-muted/80">Nepali fiscal-year purchase register</p>
          </div>
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
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {getNavGroups(session?.user?.role).map((group, gi) => (
            <div key={group.title} className={gi > 0 ? "mt-5 border-t border-border/40 pt-4" : ""}>
              <p className={navGroupLabelClasses()}>
                {group.title}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <MobileSubmenu
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onClose={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border/70 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {fiscalYears.length > 0 && (
            <div className="mb-4">
              <NavSelect
                label="Fiscal Year"
                selectId="mobile-fiscal-year-select"
                value={fiscalYearId ?? ""}
                options={fiscalYears.map((fy) => ({ value: fy.id, label: fy.name }))}
                layout="stacked"
                onChange={async (value) => {
                  if (!value) return;
                  await setActiveFiscalYear(value);
                  router.refresh();
                }}
              />
            </div>
          )}
          {session?.user && (
            <div className="flex items-center gap-3">
              <UserAvatar name={session.user.name} email={session.user.email} size="sm" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {session.user.name}
              </p>
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
        </div>
      </div>
    </>
  );
}
