# VATExpense Enhancement Plan

## Completed: Magic String Constants Audit

All magic strings/numbers/error messages have been centralized in `src/lib/status-constants.ts` and applied across:

- **Ledger statuses**: `STATUS_PENDING`, `STATUS_SAVING`, `STATUS_SAVED`, `STATUS_ERROR`, `STATUS_DUPLICATE`, `STATUS_INCOMPLETE`
- **Batch statuses**: `BATCH_STATUS_PENDING`, `BATCH_STATUS_CONFIRMED`, `BATCH_STATUS_CANCELLED`, `BATCH_ROW_STATUS_*`
- **HTTP codes**: `HTTP_OK`, `HTTP_BAD_REQUEST`, `HTTP_NOT_FOUND`, etc.
- **Content types**: `CONTENT_TYPE_JSON`, `CONTENT_TYPE_CSV`, `CONTENT_TYPE_XLSX`
- **Toast constants**: `TOAST_KIND_*`, `TOAST_*_MS`
- **Error messages**: `ERR_NOT_AUTHENTICATED`, `ERR_COMPANY_NOT_FOUND`, `ERR_EXPENSE_NOT_FOUND`, etc.
- **Import constants**: `IMPORT_BODY_SIZE_LIMIT`, `IMPORT_DATE_FORMAT`, `ALLOWED_IMPORT_EXTENSIONS`
- **Category inference**: `FUEL_KEYWORDS`, `SPARE_PARTS_KEYWORDS`, `TYRE_KEYWORDS`, `DEFAULT_CATEGORY_*`

**Files updated**: `api-response.ts`, `ledger-types.ts`, `ledger-reducer.ts`, `ledger-validation.ts`, `status-badge.tsx`, `toast.tsx`, `ledger-table.tsx`, `ledger-grid.tsx`, `common.ts`, `expenses.ts`, `companies.ts`, `fiscal-years.ts`, `categories.ts`, `parties.ts`, `trucks.ts`, `locations.ts`, `excel/route.ts`, `preview/route.ts`, `confirm/route.ts`, all export routes

---

## New Features & Fixes

### Issue 1: Pagination Enhancement
**Files:** `src/components/ui/pagination.tsx` (new), `src/components/expenses-list-client.tsx`, `src/app/expenses/page.tsx`

- Extract reusable `Pagination` component with page numbers, Previous/Next, page size selector (25/50/100/200), total items display
- Add `pageSize` search param support to the expenses page (currently hardcoded to 50)
- Wire page size selector to URL params

### Issue 2: Improve "Date falls in FY" Error Message
**Files:** `src/lib/expenses/ledger-validation.ts`

- Change error from `Date falls in FY ${fy.fiscalYearName}` to `Date falls in FY ${fy.fiscalYearName} — expected ${fiscalYearName}. Check if this is an AD date.`
- Gives user actionable guidance

### Issue 3: Smart Fix Button (Hide When No Fix Available)
**Files:** `src/lib/expenses/ledger-types.ts`, `src/lib/expenses/ledger-validation.ts`, `src/components/expenses/ledger-table.tsx`, `src/components/expenses/ledger-grid.tsx`

Smart fix behavior:
| Error | Fix Action |
|---|---|
| `"Miti required"` | Pre-fill with today's BS date via `fromEnglishDate(new Date())` |
| `"Invalid date"` | Replace with today's BS date |
| `"Category required"` | Pre-select "General" category |
| `"Fiscal year not found"` | Auto-create FY from row's miti date |
| All other errors | Hide the Fix button (not auto-fixable) |

Implementation:
- Add `getFixableAction(error: string): ((rowId: string) => void) | null` helper
- Only render Fix button when a fix action exists
- New `AUTO_FIX` reducer action with sub-types for each fix kind

### Issue 4: Increase Action Button Icons
**Files:** `src/components/expenses/ledger-table.tsx`

- Desktop/mobile duplicate button: `h-7 w-7` -> `h-8 w-8`, icon `h-3.5 w-3.5` -> `h-4 w-4`
- Desktop/mobile delete button: `h-7 w-7` -> `h-8 w-8`, icon `h-3.5 w-3.5` -> `h-4 w-4`

### Issue 5: Batch Entry Form Redesign
**Files:** `src/components/expenses/ledger-grid.tsx`, `src/components/expenses/ledger-table.tsx`, `src/components/expenses/ledger-actions.tsx`, `src/components/expenses/ledger-summary.tsx`

- Better row spacing and column width proportions
- Sticky action bar at bottom on mobile (Save + Add Row fixed at bottom)
- Visible keyboard shortcut hints panel (toggle-able)
- Improved empty state (icon + text + "Add First Row" button when no data)
- Better visual separation between rows with alternating backgrounds

### Issue 6: Navigation Active State Fix
**Files:** `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`

- For child items (items with `children` array), use **exact match** for active detection: `pathname === child.href`
- For parent items, keep prefix matching: `pathname.startsWith(href + "/")`
- "All Expenses" only highlights on `/expenses`, not on `/expenses/create` or `/expenses/new`

### Issue 7: Fiscal Year Dropdown Updates DB
**Files:** `src/lib/actions/fiscal-years.ts`, `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`, `src/lib/useApp.tsx`

- New server action `setActiveFiscalYear(fiscalYearId)` that:
  1. Sets `isActive: false` on all fiscal years for the company
  2. Sets `isActive: true` on the selected fiscal year
- On dropdown change: call server action, then update localStorage + React state
- Show brief toast confirmation

---

## Execution Order
1. Issue 6 (nav fix) - small, self-contained
2. Issue 4 (icon sizes) - small visual improvement
3. Issue 2 (error message) - small text change
4. Issue 7 (FY dropdown -> DB) - adds server action + wiring
5. Issue 3 (smart Fix button) - moderate complexity
6. Issue 1 (pagination) - new component + wiring
7. Issue 5 (batch entry redesign) - largest change
