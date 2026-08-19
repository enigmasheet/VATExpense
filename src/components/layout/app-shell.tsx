"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppProvider } from "@/lib/useApp";
import { AuthProvider } from "@/lib/auth-provider";
import { ToastProvider } from "@/components/ui/toast";
import { PATH_LOGIN, PATH_ADMIN } from "@/lib/constants";
import { Sidebar } from "./sidebar";
import { MobileHeader, ActiveFiscalYearIndicator } from "./mobile-nav";
import { useSidebarCollapsed, toggleSidebarCollapsed } from "./useSidebarCollapsed";

/**
 * Provides the responsive application shell for authenticated content.
 *
 * @param children - The application content rendered in the main area
 * @returns The application shell containing navigation, content, and footer
 */
export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useSidebarCollapsed();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith(PATH_LOGIN);
  const isAdminRoute = pathname.startsWith(PATH_ADMIN);

  if (isAuthPage) {
    return <>{children}</>;
  }

    return (
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            {isAdminRoute ? (
              <>{children}</>
            ) : (
            <>
            <div className="flex h-screen overflow-hidden">
              {/* Skip to content link for keyboard/screen-reader users */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded"
              >
                Skip to content
              </a>

              {/* Desktop sidebar */}
              <div className="hidden lg:flex">
                <Sidebar collapsed={collapsed} onToggleCollapsed={toggleSidebarCollapsed} />
              </div>

              {/* Mobile header */}
              <MobileHeader />

              {/* Main content */}
              <div className="flex flex-1 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4.5rem)] lg:pb-0">
                <main id="main-content" className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
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
            </>
            )}
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    );
}
