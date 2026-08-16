"use client";

import { MasterPage } from "@/components/master-page";

export default function TrucksPage() {
  return (
    <MasterPage
      title="Trucks"
      singularName="Truck"
      description="Manage your fleet of trucks for fuel and maintenance tracking."
      listUrl="/api/trucks"
      fields={[
        { name: "name", label: "Truck Number", type: "text", required: true, placeholder: "e.g., Na 1 2345" },
        { name: "ownerName", label: "Owner / Driver", type: "text", required: false, placeholder: "Optional" },
        { name: "truckType", label: "Truck Type", type: "text", required: false, placeholder: "e.g., Container, Tanker" },
      ]}
      columns={[]}
      buildPayload={(companyId, values) => ({
        companyId,
        name: values.name,
        ownerName: values.ownerName || null,
        truckType: values.truckType || null,
      })}
      emptyHint="No trucks yet. Add your first one."
    />
  );
}
