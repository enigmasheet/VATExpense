"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { AppProvider, useApp } from "@/lib/use-app";
import { Select } from "@/components/ui/field";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/parties", label: "Parties" },
  { href: "/categories", label: "Categories" },
  { href: "/locations", label: "Locations" },
  { href: "/fiscal-years", label: "Fiscal Years" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted hover:bg-[#efeee8] hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function ContextBar() {
  const { companies, companyId, setCompanyId, fiscalYears, fiscalYearId, setFiscalYearId } = useApp();
  return (
    <div className="flex items-center gap-3">
      {companyId && (
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
          aria-label="Company"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {companyId && fiscalYears.length > 0 && (
        <select
          value={fiscalYearId ?? ""}
          onChange={(e) => e.target.value && setFiscalYearId(e.target.value)}
          className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
          aria-label="Fiscal year"
        >
          {fiscalYears.map((fy) => (
            <option key={fy.id} value={fy.id}>
              {fy.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-xl font-semibold text-foreground">
          VAT Expense Ledger
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
              }
            />
          ))}
        </nav>
        <ContextBar />
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border py-4 text-center text-xs text-muted">
          VAT Expense Ledger · Nepali fiscal-year purchase register
        </footer>
      </div>
    </AppProvider>
  );
}