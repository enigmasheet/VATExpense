import { Fragment, type ReactNode } from "react";

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
  bottomContent?: ReactNode;
  onRowClick?: (row: T) => void;
  expandedRow?: (row: T) => ReactNode;
  className?: string;
  variant?: "responsive" | "desktop-only";
  compact?: boolean;
  caption?: string;
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
 * @param bottomContent - Optional content rendered below the table (e.g. pagination)
 * @param onRowClick - Optional handler invoked when a desktop row is clicked
 * @param expandedRow - Optional renderer for an expandable detail row under a row
 * @param className - Additional classes for the outer surface
 * @param variant - responsive renders both layouts; desktop-only keeps one table
 * @param compact - Reduces cell padding for dense tables
 * @param caption - Optional caption for accessibility
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  mobileCard,
  rowClassName,
  emptyState,
  topContent,
  bottomContent,
  onRowClick,
  expandedRow,
  className = "",
  variant = "responsive",
  compact = false,
  caption,
}: DataTableProps<T>) {
  const cell = compact ? "px-3 py-2" : "px-5 py-3";
  const alignClass = (align: "left" | "right" | undefined) =>
    align === "right" ? "text-right" : "";

  const table = (
    <table className="w-full text-left text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted">
          {columns.map((col) => (
            <th key={col.header} scope="col" className={`${cell} ${alignClass(col.align)}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const expanded = expandedRow?.(row);
          return (
            <Fragment key={getKey(row)}>
              <tr
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(row); } } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                className={`border-b border-border/60 last:border-b-0 ${rowClassName?.(row) ?? ""} ${onRowClick ? "cursor-pointer hover:bg-surface-hover" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.header} className={`${cell} ${alignClass(col.align)}`}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
              {expanded && (
                <tr className="border-b border-border/60 last:border-b-0">
                  <td colSpan={columns.length} className="bg-surface-muted/50 px-5 py-3">
                    {expanded}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );

  if (variant === "desktop-only") {
    return (
      <div className={`overflow-x-auto rounded-lg border border-border/60 bg-surface ${className}`}>
        {topContent}
        {rows.length === 0 && emptyState ? emptyState : table}
        {bottomContent}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border/60 bg-surface ${className}`}>
      {topContent}
      {rows.length === 0 && emptyState ? (
        emptyState
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">{table}</div>
          {mobileCard && (
            <div className="sm:hidden">
              {rows.map((row) => (
                <div key={getKey(row)} className="border-b border-border/60 p-5 last:border-b-0">
                  {mobileCard(row)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {bottomContent}
    </div>
  );
}
