"use client";

import { MasterPage, type FieldSpec, type ColumnSpec } from "@/components/master-page";
import { Badge } from "@/components/ui/badge";

interface FiscalYearRow {
  id: string;
  name: string;
  isActive: boolean;
  startYear: number;
  endYear: number;
}

const fields: FieldSpec[] = [
  { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. 2082/83" },
  { name: "startYear", label: "Start year (BS)", type: "number", required: true, placeholder: "2082" },
  { name: "endYear", label: "End year (BS)", type: "number", required: true, placeholder: "2083" },
  { name: "isActive", label: "Set as current", type: "checkbox" },
];

const columns: ColumnSpec<FiscalYearRow>[] = [
  { header: "Period", render: (item) => `${item.startYear} – ${item.endYear}` },
  {
    header: "Active",
    render: (item) =>
      item.isActive ? (
        <Badge tone="success">Current</Badge>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
];

/**
 * Renders the fiscal years management page.
 */
export default function FiscalYearsPage() {
  return (
    <MasterPage<FiscalYearRow>
      title="Fiscal Years"
      singularName="Fiscal Year"
      description="Nepali fiscal years (Shrawan to Ashadh). Marking one as current switches all records."
      listUrl="/api/fiscal-years"
      fields={fields}
      columns={columns}
      buildPayload={(companyId, values) => ({
        companyId,
        name: values.name,
        startYear: Number(values.startYear),
        endYear: Number(values.endYear),
        isActive: values.isActive === "true",
      })}
      emptyHint="No fiscal years yet. Create 2082/83 to start."
    />
  );
}