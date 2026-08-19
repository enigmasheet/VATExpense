import type { ReactNode } from "react";
import { NavIcon } from "@/components/layout/icons";

export function NoFiscalYearEmpty({ action }: { action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-surface p-8 text-center">
      <NavIcon name="fiscalYears" className="mx-auto mb-3 h-8 w-8 text-muted" />
      <p className="text-sm font-medium text-foreground">No fiscal year selected</p>
      <p className="mt-1 text-sm text-muted">Create or select a fiscal year to get started.</p>
      <div className="mt-4">
        {action ?? (
          <a href="/fiscal-years" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted">
            Manage fiscal years
          </a>
        )}
      </div>
    </div>
  );
}

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden="true">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-foreground hover:underline">{item.label}</a>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function StatGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${className}`}>
      {children}
    </div>
  );
}

interface CardSectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CardSection({ title, subtitle, action, children, className = "" }: CardSectionProps) {
  return (
    <section className={`rounded-lg border border-border/60 bg-surface ${className}`}>
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

interface MobileAmountRowProps {
  label: string;
  value: string;
  accent?: boolean;
}

export function MobileAmountRow({ label, value, accent = false }: MobileAmountRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`tabular-amount font-medium ${accent ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
