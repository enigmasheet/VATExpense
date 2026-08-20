# VATExpense Enhancement Plan

## Completed: Modal Visibility Bug Fix

**Problem:** Admin slide-over panels (New company, New user, Edit user) appeared "not rendering" — the modal opened (`open=true`) but was invisible (`opacity-0 pointer-events-none`). Clicks passed through to the trigger button, creating a loop where the modal never appeared to the user.

**Root cause:** The shared `Modal` component used a render-phase `if (prevOpen !== open) { setVisible(false) }` block that raced the one-shot RAF effect (`setVisible(true)` keyed only on `open`). Under StrictMode double-rendering and rapid re-clicking, `visible` got stuck `false` while `open` was `true`, leaving the modal permanently invisible.

**Fix:** Removed the `prevOpen` state and render-phase reset. Replaced the fragile RAF pattern with a deterministic effect keyed on `open`:
- On open: `setClosing(false)` + RAF → `visible=true`.
- On close: `setVisible(false)` immediately + `setClosing(true)` with 200ms unmount delay.
- Removed all debug console.logs added in `c07316d`.

**Files changed:** `src/components/ui/modal.tsx`, `src/components/admin/provision-panel.tsx`, `src/components/admin/companies-page.tsx`

**Verification:** `pnpm lint` (clean), `pnpm typecheck` (clean), `pnpm test` (402/402 passed).

---

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

## Completed: Import Pipeline Enhancements

### VAT-Based Party Resolution (`preview/route.ts`)
Added VAT number as a first-class business key for party resolution during import:
- **`partyByVat` map** built from parties with `normalizedVatNumber`.
- **VAT fallback** (always on): if alias/normalized name match fails, falls back to VAT number match. VAT is unique per company, so this is a strong key.
- Parties like "woldlink communication ltd" now match by VAT even if the name is misspelled.

### Party-Aware Duplicate Invoice Detection (`preview/route.ts`)
Changed in-batch and cross-DB duplicate detection from invoice-only to invoice+party keys:
- **In-batch**: keys by `invoice + partyId` (or normalized raw party name if no party resolved). Cross-party invoice numbers no longer flagged as duplicates.
- **Cross-DB**: queries existing expenses per row's resolved party. Same invoice for different parties is now correctly allowed.

### PATCH Endpoint for Suggestion Apply (`rows/[rowId]/route.ts`)
New `PATCH /api/import/[batchId]/rows/[rowId]` endpoint:
- Accepts `rawPartyName`, `rawCategoryName`, `rawMiti`, `rawLocationName`, `rawVatNumber`, `rawItem`, `rawInvoiceNumber`.
- Validates batch status is "pending" and owned by the user's company.
- Client calls this endpoint when the user clicks "Use this" on a suggestion, then re-fetches preview.

### "Use This" Suggestion Button (`import/page.tsx`)
Clickable button next to "Did you mean X?" suggestions:
- Calls `PATCH` endpoint to apply the suggestion to the row's raw field.
- Re-fetches preview to re-resolve all rows.
- Shows loading state during the apply.

### CSV Date Preservation (`excel/route.ts`)
Fixed XLSX library auto-converting date-like strings to serial numbers:
- **Root cause**: `XLSX.read(buffer)` without `raw: true` auto-detects date strings and converts to serial numbers.
- **Fix**: `XLSX.read(buffer, { type: "buffer", raw: true })` for CSV files. `dateNF` retained for Excel files.
- Dates like `01/03/2083`, `11-03-2083` now preserved verbatim.

### Category Inference Enhancements (`preview/route.ts`, `status-constants.ts`)
Expanded fuel detection and added token-based inference:
- **`FUEL_KEYWORDS`**: added `"disel"` (common misspelling of diesel).
- **`FUEL_TOKEN_KEYWORDS`**: new set `["per", "hsd", "pms"]` — exact token match (splits item on non-alphanumeric). Prevents `"paper"` from matching token `"per"`.
- **Token-based matching**: long keywords use substring match on tokens, short keywords use exact token match.

### Item Aliases (`normalize-master-data.ts`)
Added common misspelling aliases:
- `"disel"` → `"Diesel"`, `"pms"` → `"Petrol"`, `"per"` → `"Petrol"`, `"hsd"` → `"Diesel"`

### Party Auto-Resolve on High-Confidence Fuzzy (`preview/route.ts`)
When `autoCreate` is ON, and `findSimilarNames` returns exactly 1 candidate within distance 2:
- Auto-resolves to the existing party (instead of creating a new one).
- Emits a warning: `Party "X" auto-matched to existing party "Y"`.
- Falls through to create new only when no confident match exists.

### Duplicate Invoice Toast (`expense-form.tsx`)
Added `toast(err.detail, "error")` in the 409 catch block. Duplicate invoice conflicts now show both an inline danger message AND a toast notification.

### Modal Portal Fix (`modal.tsx`)
Portaled all modal content to `document.body` via `createPortal` with a `mounted` guard:
- Fixes `<form> cannot contain a nested <form>` hydration error from `PartyFormFields` and `LocationFormModal` inside `ExpenseForm`.
- `mounted` state + `useEffect` ensures `document.body` exists before portaling (SSR-safe).
- All modals (admin slide-overs, confirm dialogs, mobile-nav Reports sheet) are now portaled.

---

## Still Open

### Issue 1: Import Per-Row Fiscal Year Resolution
**Status**: Deferred — user chose to skip for now.

All imported rows currently use `batch.fiscalYearId` regardless of their miti date. Rows whose dates fall in a different fiscal year are filed under the wrong FY.

**Planned fix** (`confirm/route.ts`):
- Resolve each row's FY from `resolvedMiti` via `resolveFiscalYear(companyId, miti)`.
- Group by FY, insert in batches.
- Preview shows target FY per row + "will create N fiscal year(s)" count.

### Issue 2: Batch Entry Form Redesign
**Status**: Partially complete.

- Better row spacing and column width proportions
- Sticky action bar at bottom on mobile (Save + Add Row fixed at bottom)
- Visible keyboard shortcut hints panel (toggle-able)
- Improved empty state (icon + text + "Add First Row" button when no data)
- Better visual separation between rows with alternating backgrounds

### Issue 3: Smart Fix Button (Hide When No Fix Available)
**Status**: Not started.

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

---

## Execution Order
1. ~~Issue 6 (nav fix)~~ — Done
2. ~~Issue 4 (icon sizes)~~ — Done
3. ~~Issue 2 (error message)~~ — Done
4. ~~Issue 7 (FY dropdown -> DB)~~ — Done
5. Issue 3 (smart Fix button) — moderate complexity
6. Issue 1 (pagination) — Done
7. Issue 5 (batch entry redesign) — partially done
8. Import FY resolution — Deferred
