# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- **Party statement sorting** (`party-statement.ts`): Invoice numbers are now sorted numerically (`862` before `8456`, previously text-sorted) and BS dates sort chronologically regardless of stored format (`YYYY-MM-DD` or `DD/MM/YYYY`). Sort order is now miti → createdAt → numeric invoice number.
- **Navigation submenu expansion** (`sidebar.tsx`, `mobile-nav.tsx`): Submenus now expand/collapse reactively when route changes. Previously, submenus only expanded on initial render and stayed expanded after navigating away.
- **Reports tab active detection** (`mobile-nav.tsx`): Fixed imprecise `pathname.startsWith("/reports")` to include exact-match guard, preventing false positives on hypothetical `/reportsXYZ` paths.
- **Expenses list ordering** (`expenses.ts`): `getExpenses()` and `getDashboardSummary()` now use normalized date sort + invoice number numeric sort + createdAt, matching the party statement pattern.
- **Import cross-DB duplicate check** (`preview/route.ts`): Duplicate detection now checks per-row FY instead of the batch-level FY. Rows with miti in different FYs no longer get false-positive duplicate warnings.

### Added

- **Per-row fiscal year resolution in import** (`preview/route.ts`, `confirm/route.ts`): Each import row's fiscal year is now resolved from its miti date. Missing FYs are auto-created via `resolveFiscalYear()`. The batch-level FY is only used as a fallback for invalid dates.
- **Import FY column** (`import-preview-table.tsx`): New "FY" column in the preview table showing each row's resolved fiscal year. Rows whose FY differs from the batch FY are highlighted with "(differs)" in warning color.
- **Import FY mismatch warning** (`page.tsx`): When any rows resolve to a different FY than the batch, a warning banner explains that these rows will be filed under their correct FY automatically.
- **App version display** (`sidebar.tsx`, `mobile-nav.tsx`): Version number shown in sidebar footer (expanded: text, collapsed: title attribute) and mobile drawer footer. Version injected from `package.json` via `next.config.ts` env.

## [1.0.0] - 2026-08-20

### Fixed

- **Modal portal hydration error**: Portaled all modal content to `document.body` via `createPortal` with a `mounted` state guard. Fixes `<form> cannot contain a nested <form>` hydration error from `PartyFormFields` and `LocationFormModal` inside `ExpenseForm`. The `mounted` guard prevents SSR `createPortal` crashes (required because `mobile-nav.tsx` renders `<Modal open>` at mount).
- **Duplicate invoice toast**: Added `toast(err.detail, "error")` for 409 conflict responses in `expense-form.tsx`. Duplicate invoice warnings now show both an inline danger message AND a toast notification.
- **CSV date mangling**: Changed XLSX read to `{ raw: true }` for CSV files in `excel/route.ts`. Dates like `01/03/2083` and `11-03-2083` are now preserved verbatim instead of being auto-converted to serial numbers.

### Added

- **VAT-based party resolution** (`preview/route.ts`): Added `partyByVat` map for VAT number lookup. VAT numbers are unique per company, providing a strong fallback key when party names are misspelled (e.g. "woldlink communication ltd" matches by VAT).
- **Party-aware duplicate detection** (`preview/route.ts`): In-batch and cross-DB duplicate detection now keys by `invoice + partyId` instead of invoice alone. Same invoice for different parties is correctly allowed.
- **PATCH endpoint for suggestions** (`/api/import/[batchId]/rows/[rowId]`): New endpoint to update raw fields on import rows. Validates batch is pending and company-owned.
- **"Use this" suggestion button** (`import/page.tsx`): Clickable button next to "Did you mean X?" suggestions. Applies the suggestion via PATCH and re-fetches preview.
- **Token-based category inference** (`preview/route.ts`): Added `FUEL_TOKEN_KEYWORDS` (`per`, `hsd`, `pms`) with exact token matching. Prevents `"paper"` from matching the `"per"` token.
- **Item aliases**: Added `"disel"` → `"Diesel"`, `"pms"` → `"Petrol"`, `"per"` → `"Petrol"`, `"hsd"` → `"Diesel"` in `normalize-master-data.ts`.
- **Party auto-resolve** (`preview/route.ts`): When `autoCreate` is ON and `findSimilarNames` returns exactly 1 candidate within distance 2, auto-resolves to the existing party instead of creating a new one.

### Changed

- **AGENTS.md**: Complete restructure with accurate project structure, architecture docs (auth, DB schema, import pipeline, duplicate detection, fiscal year resolution, normalization), API conventions, shared UI patterns, known pitfalls, and testing conventions.
- **README.md**: Replaced create-next-app boilerplate with real project documentation (setup, env vars, commands, features).
- **PLAN.md**: Updated with completed import enhancements, modal portal fix, and current status of remaining issues.

### Categories

- `FUEL_KEYWORDS`: Added `"disel"` (common misspelling).
- `FUEL_TOKEN_KEYWORDS`: New set `["per", "hsd", "pms"]` for exact token matching.
