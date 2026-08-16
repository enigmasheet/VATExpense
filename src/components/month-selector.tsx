"use client";

import { NavSelect } from "@/components/ui/nav-select";
import { NEPALI_MONTHS } from "@/lib/nepali-date";

/**
 * Provides a selector for navigating between Nepali months.
 *
 * @param currentMonth - The month initially selected in the selector
 * @returns A month navigation control
 */
export function MonthSelector({ currentMonth }: { currentMonth: string }) {
  return (
    <NavSelect
      label="Switch month"
      selectId="month-nav"
      value={currentMonth}
      options={NEPALI_MONTHS.map((m) => ({ value: m, label: m }))}
      selectName="month"
      action="/reports/monthly"
    />
  );
}