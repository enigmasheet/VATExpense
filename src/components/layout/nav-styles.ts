export function navItemClasses(active: boolean): string {
  return [
    "relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
    active
      ? "bg-primary/10 text-primary"
      : "text-muted hover:bg-surface-hover hover:text-foreground",
  ].join(" ");
}

export function navItemCollapsedClasses(active: boolean): string {
  return [
    "relative flex items-center justify-center rounded-lg py-2.5 transition-colors duration-150",
    active
      ? "bg-primary/10 text-primary"
      : "text-muted hover:bg-surface-hover hover:text-foreground",
  ].join(" ");
}

export function navGroupLabelClasses(): string {
  return "mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted/90";
}

export const NAV_ACCENT_BAR =
  "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary";
