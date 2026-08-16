"use client";

import { MasterPage } from "@/components/master-page";

/**
 * Renders the locations management page.
 *
 * @returns The locations management page.
 */
export default function LocationsPage() {
  return (
    <MasterPage
      title="Locations"
      singularName="Location"
      description="Places where purchases happen — used to group expenses for reporting."
      listUrl="/api/locations"
      fields={[
        {
          name: "name",
          label: "Location name",
          type: "text",
          required: true,
          placeholder: "e.g. Kathmandu",
        },
      ]}
      columns={[]}
      buildPayload={(companyId, values) => ({ companyId, name: values.name })}
      emptyHint="No locations yet. Add your first one."
    />
  );
}