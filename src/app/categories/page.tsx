"use client";

import { MasterPage } from "@/components/master-page";

/**
 * Renders the expense categories management page.
 */
export default function CategoriesPage() {
  return (
    <MasterPage
      title="Categories"
      description="Expense categories such as rent, utilities and office supplies."
      listUrl="/api/categories"
      fields={[
        {
          name: "name",
          label: "Category name",
          type: "text",
          required: true,
          placeholder: "e.g. Office Supplies",
        },
      ]}
      columns={[]}
      buildPayload={(companyId, values) => ({ companyId, name: values.name })}
      emptyHint="No categories yet. Add your first one above."
    />
  );
}