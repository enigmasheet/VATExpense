# VATExpense — Refinement & Enhancement Plan

## Status: Phases 1-6 Complete

### Phase 1: Import UX Fixes ✅
- Added "Download Template" button generating CSV with correct headers
- Added `ConfirmDialog` before import confirmation
- Shows auto-created master data counts (parties, categories, locations)
- Added "Cancel" button to reset import form
- Improved error message for invalid file uploads

### Phase 2: Mobile Card View for Ledger ✅
- Rewrote `ledger-table.tsx` with responsive design
- Desktop: table view on `md+`
- Mobile: card view with stacked fields below `md`
- Added `aria-label` to all form inputs
- Replaced raw `<button>` with `Button` component

### Phase 3: Export Error Handling ✅
- Replaced `window.open()` with `fetch()` + blob download in all 3 export components
- Added loading states (button disabled while downloading)
- Added toast notifications for success/error
- Files: `monthly-report-export.tsx`, `fiscal-year-report-export.tsx`, `party-report-export.tsx`

### Phase 4: Loading States & Error Boundaries ✅
- Created `loading.tsx` for 9 routes (expenses, reports/*, parties, categories, locations, fiscal-years, import)
- Created `error.tsx` for 9 routes with retry button

### Phase 5: Code Quality ✅
- Removed unused `ApiInputError` class from `validation/utils.ts`
- Replaced duplicate `VAT_FACTOR` in `expense-form.tsx` with import from `ledger-calculation.ts`
- Added error toasts to silent catches in `expense-form.tsx`, `party-form-modal.tsx`, `parties/page.tsx`
- Updated `status-badge.tsx` to use semantic tokens (`success`, `danger`, `warning`)
- Updated `ledger-actions.tsx` to use `Button` component
- Added `caption` prop to `DataTable` for accessibility

### Phase 6: Export Improvements ✅
- Added `Category` column to re-import CSV format
- Updated filenames to include company and fiscal year names
- Added empty data guards (returns 404 with error message)
- Added `?format=csv` support to fiscal-year and parties export routes

## Remaining (Deferred)

### Phase 7: Master Data Enhancements
- CSV export/import for parties
- Extended search by VAT, phone, location

### Phase 8: Import History
- History page for past imports
- Revert endpoint for batch undo

## Test Results
- 173/173 tests passing
- TypeScript clean
