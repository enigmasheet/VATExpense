"use client";

import { useApp } from "@/lib/useApp";
import { useCategories, useItemCategories } from "@/lib/hooks/use-reference-data";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CategoriesTable } from "@/components/categories/categories-table";
import { ItemLinksTable } from "@/components/categories/item-links-table";

export function CategoriesPage() {
  const { companyId } = useApp();
  const { data: categories = [], isLoading: loadingCategories, error: categoriesError } = useCategories(companyId ?? "");
  const { data: links = [], isLoading: loadingLinks, error: linksError } = useItemCategories(companyId ?? "");

  const error = categoriesError?.message ?? linksError?.message ?? null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Categories"
        subtitle="Expense categories and item-to-category links used to auto-resolve categories during expense entry."
      />

      <CategoriesTable categories={categories} links={links} isLoading={loadingCategories} error={error} />

      <ItemLinksTable links={links} categories={categories} isLoading={loadingLinks} error={null} />
    </div>
  );
}
