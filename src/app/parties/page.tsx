"use client";

import { MasterPage, type FieldSpec, type ColumnSpec } from "@/components/master-page";

interface PartyRow {
  id: string;
  name: string;
  isActive: boolean;
  vatNumber: string | null;
  locationName: string | null;
}

const fields: FieldSpec[] = [
  { name: "name", label: "Supplier name", type: "text", required: true, placeholder: "e.g. ABC Stationers" },
  { name: "vatNumber", label: "VAT number", type: "text", placeholder: "e.g. 305123456" },
  {
    name: "locationId",
    label: "Location",
    type: "select",
    optionsUrl: "/api/locations",
  },
];

const columns: ColumnSpec<PartyRow>[] = [
  {
    header: "VAT",
    render: (item) => item.vatNumber ?? <span className="text-muted">—</span>,
  },
  {
    header: "Location",
    render: (item) => item.locationName ?? <span className="text-muted">—</span>,
  },
];

/**
 * Renders the parties management page for suppliers and vendors.
 */
export default function PartiesPage() {
  return (
    <MasterPage<PartyRow>
      title="Parties"
      description="Suppliers and vendors. VAT numbers are matched automatically to catch duplicates."
      listUrl="/api/parties"
      fields={fields}
      columns={columns}
      buildPayload={(companyId, values) => ({
        companyId,
        name: values.name,
        vatNumber: values.vatNumber || null,
        locationId: values.locationId || null,
      })}
      emptyHint="No parties yet. Add your first supplier above."
    />
  );
}