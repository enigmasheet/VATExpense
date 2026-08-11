"use client";

import { NEPALI_MONTHS } from "@/lib/nepali-date";

/**
 * Provides a selector for navigating between Nepali months.
 *
 * @param currentMonth - The month initially selected in the selector
 * @returns A month navigation control
 */
export function MonthSelector({ currentMonth }: { currentMonth: string }) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-foreground" htmlFor="month-nav">
        Switch month
      </label>
      <form action="/reports/monthly" method="get">
        <select
          id="month-nav"
          name="month"
          defaultValue={currentMonth}
          onChange={(e) => e.target.form?.requestSubmit()}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {NEPALI_MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </form>
    </div>
  );
}
