import type { ReactNode } from "react";

export interface DataColumn<T> {
  header: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
  mobileCard?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
  emptyState?: ReactNode;
  topContent?: ReactNode;
  className?: string;
  variant?: "responsive" | "desktop-only";
  compact?: boolean;
}

/**
 * Renders rows as a responsive table: a desktop table on sm+ and an optional
 * mobile card list below sm, wrapped in a shared bordered surface.
 *
 * @param columns - Column definitions rendering each row's desktop cells
 * @param rows - The data rows to display
 * @param getKey - Extracts a stable key from a row
 * @param mobileCard - Optional renderer for the mobile card list
 * @param rowClassName - Optional per-row classes applied to desktop rows
 * @param emptyState - Content rendered inside the surface when rows is empty
 * @param topContent - Optional content rendered above the table (e.g. a search box)
 * @param className - Additional classes for the outer surface
 * @param variant - responsive renders both layouts; desktop-only keeps one table
 * @param compact - Reduces cell padding for dense tables
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  mobileCard,
  rowClassName,
  emptyState,
  topContent,
  className = "",
  variant = "responsive",
  compact = false,
}: DataTableProps<T>) {
  const cell = compact ? "px-3 py-2" : "px-4 py-3";
  const alignClass = (align: "left" | "right" | undefined) =>
    align === "right" ? "text-right" : "";

  const table = (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
          {columns.map((col) => (
            <th key={col.header} className={`${cell} ${alignClass(col.align)}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={getKey(row)}
            className={`border-b border-border last:border-b-0 ${rowClassName?.(row) ?? ""}`}
          >
            {columns.map((col) => (
              <td key={col.header} className={`${cell} ${alignClass(col.align)}`}>
                {col.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (variant === "desktop-only") {
    return (
      <div className={`overflow-x-auto rounded-lg border border-border bg-surface ${className}`}>
        {topContent}
        {rows.length === 0 && emptyState ? emptyState : table}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border bg-surface ${className}`}>
      {topContent}
      {rows.length === 0 && emptyState ? (
        emptyState
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">{table}</div>
          {mobileCard && (
            <div className="sm:hidden">
              {rows.map((row) => (
                <div key={getKey(row)} className="border-b border-border p-4 last:border-b-0">
                  {mobileCard(row)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
