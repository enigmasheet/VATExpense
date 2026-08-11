"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppProvider } from "@/lib/use-app";
import { AuthProvider } from "@/lib/auth-provider";
import { Sidebar } from "./sidebar";
import { MobileHeader, ActiveFiscalYearIndicator } from "./mobile-nav";
import { useSidebarCollapsed, toggleSidebarCollapsed } from "./use-sidebar-collapsed";

/**
 * Provides the responsive application shell for authenticated content.
 *
 * @param children - The application content rendered in the main area
 * @returns The application shell containing navigation, content, and footer
 */
export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useSidebarCollapsed();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/login");

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            <Sidebar collapsed={collapsed} onToggleCollapsed={toggleSidebarCollapsed} />
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
