# VATExpense — Enhancement Plan & TODO

Single tracking document for planned work, open PRs, and completed changes. Both user and agents append items here. Mark items `- [x]` when done.

---

## Open PRs (Review)

(No open PRs — PRs #11 and #12 are merged.)

---

## TODO

- [ ] **Branch consolidation** — delete stale branches (`dev`, `LatestDevelop`, `feature/backend-audit`, `feature/phase3-audit-hardening`). Consolidate on `develop`/`main`. | Priority: low

- [x] **Per-row fiscal year resolution in import** — resolve each row's FY from its miti, auto-create if missing, per-row duplicate check. | Priority: high | Files: `src/app/api/import/[batchId]/preview/route.ts`, `confirm/route.ts`, `src/lib/db/schema.ts`, migration `0013`, `src/app/import/types.ts`, `import-preview-table.tsx`, `page.tsx`

- [x] **Smart Fix button** — hide when error is not auto-fixable (only show for: missing miti, invalid date, missing category, FY not found). | Priority: medium | Files: `src/lib/expenses/ledger-validation.ts`, `src/lib/expenses/ledger-reducer.ts`, `src/components/expenses/ledger-table.tsx`

- [x] **Batch entry form redesign** — sticky mobile action bar, empty state icon + button, alternating row backgrounds. | Priority: low | Files: `src/components/expenses/ledger-grid.tsx`, `src/components/expenses/ledger-table.tsx`, `src/components/expenses/ledger-actions.tsx`

- [x] **Navigation active state** — ensure child items use exact match for active detection. | Priority: low | Files: `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`

---

## Completed

### Batch Entry Polish + Navigation + Smart Fix (2026-08-31)
- **Batch entry empty state:** LedgerTable shows centered empty state with icon and text when no rows exist.
- **Alternating row backgrounds:** Pending/incomplete rows alternate between no background and subtle muted background. Status-driven colors (error, saved, etc.) remain unchanged.
- **Sticky mobile action bar:** Action buttons (Add row, Save, Clear saved) stick to viewport bottom on mobile while table scrolls. Hidden behind bottom tab bar (z-20 vs z-30). Desktop layout unaffected.
- **Navigation submenu reactivity:** Sidebar and mobile nav submenus now expand/collapse reactively when route changes. Uses ref-based state adjustment during render (avoids useEffect setState lint error).
- **Reports tab active check:** Fixed imprecise `startsWith("/reports")` to exact match + trailing-slash guard.
- **Smart Fix for FY mismatch:** New `autoCreateFiscalYear` FixActionType. When a row's miti falls in a different FY, a "Create FY & fix" button appears. Clicking clears the error; actual FY creation happens at save time via `resolveFiscalYear`.
- **Verification:** typecheck clean, lint clean, 412 tests pass.

### Import Per-Row Fiscal Year Resolution (2026-08-31)
- **Schema:** Added `resolved_fiscal_year_id` column to `import_batch_rows` (migration `0013`).
- **Preview endpoint:** Resolves each row's FY from its miti date using existing fiscal year records. Falls back to batch FY only for invalid dates. Cross-DB duplicate check now uses per-row FY instead of batch-level FY.
- **Confirm endpoint:** Uses `resolveFiscalYear()` to auto-create missing FYs instead of inline lookup. Each row is filed under its correct FY.
- **Preview table:** New "FY" column showing resolved fiscal year name. Rows differing from batch FY highlighted with "(differs)".
- **FY mismatch warning:** Warning banner on import page when any rows resolve to a different FY than the batch.
- **App version display:** Version injected from `package.json` via `next.config.ts` env. Displayed in sidebar footer (expanded + collapsed) and mobile drawer footer.
- **Verification:** typecheck clean, lint clean, 412 tests pass.

### Item-Category Links + Expense Form UX + Truck Documents (2026-08-26)
- **Item-category links:** New `item_categories` table (`schema.ts`, migration `0011`), service, actions, and APIs (`/api/item-categories`, `[id]`, `lookup`). CRUD integrated into the Categories page as a second section ("Item-Category Links").
- **Expense form:** Location dropdown hidden — `locationId` auto-fills from selected party. Category dropdown removed. Item field is now an autocomplete backed by item-category links with inline "Link" modal for unknown items.
- **Truck documents:** New `truck_documents` table (type, number, BS expiry date, BS reminder date), service/actions/APIs, documents page at `/trucks/[id]/documents` linked from the Trucks page.
- **Party statement sorting fixed:** numeric invoice sort + BS-date chronological sort in `party-statement.ts`.
- **Verification:** typecheck clean, lint clean, 412 tests pass, production build passes, schema pushed to local DB.

### Modal Visibility Bug Fix
**Problem:** Admin slide-over panels appeared "not rendering" — `open=true` but invisible (`opacity-0 pointer-events-none`).
**Root cause:** Render-phase `prevOpen` reset raced the RAF effect; `visible` stuck `false` while `open` true.
**Fix:** Removed render-phase reset. Deterministic effect: open → `setClosing(false)` + RAF → `visible=true`; close → `visible=false` + `closing=true` 200ms delay. Removed debug `console.log`s from `c07316d`.
**Files:** `modal.tsx`, `provision-panel.tsx`, `companies-page.tsx`

### Magic String Constants Audit
All magic strings/numbers/error messages centralized in `src/lib/status-constants.ts` and applied across 20+ files.

### Import Pipeline Enhancements
- **VAT-based party resolution** — `partyByVat` map, VAT fallback always on.
- **Party-aware duplicate detection** — keys by `invoice + partyId` instead of invoice alone.
- **PATCH endpoint** (`/rows/[rowId]`) — update raw fields on suggestion apply.
- **"Use this" suggestion button** — clickable, calls PATCH, re-fetches preview.
- **CSV date preservation** — `XLSX.read(buffer, { raw: true })` for CSV files.
- **Category inference** — added `disel` to `FUEL_KEYWORDS`, new `FUEL_TOKEN_KEYWORDS` (`per`, `hsd`, `pms`) with token matching.
- **Item aliases** — `disel → Diesel`, `pms → Petrol`, `per → Petrol`, `hsd → Diesel`.
- **Party auto-resolve** — 1 candidate within distance 2 when `autoCreate` ON.
- **Duplicate invoice toast** — `toast(err.detail, "error")` for 409 in `expense-form.tsx`.
- **Modal portal fix** — `createPortal` to `document.body` with `mounted` guard. Fixes nested `<form>` hydration errors.

### Still Open (details)

#### Import Per-Row Fiscal Year Resolution
**Status:** Complete. Each row's FY is resolved from its miti via existing fiscal year records. Missing FYs are auto-created during confirm via `resolveFiscalYear()`. Cross-DB duplicate check now uses per-row FY. Preview table shows FY column with mismatch highlighting. Warning banner displayed when rows differ from batch FY.

#### Batch Entry Form Redesign
**Status:** Complete. Empty state when no rows, alternating row backgrounds for pending rows, sticky mobile action bar.

#### Smart Fix Button
**Status:** Complete. Shows Fix for: missing miti (→ today's BS date), invalid date (→ today), missing category (→ General), FY not found (→ auto-create FY). All other errors correctly show no button.

---

## Execution Order
1. ~~Issue 6 (nav fix)~~ — Done
2. ~~Issue 4 (icon sizes)~~ — Done
3. ~~Issue 2 (error message)~~ — Done
4. ~~Issue 7 (FY dropdown -> DB)~~ — Done
5. ~~Issue 3 (smart Fix button)~~ — Done
6. ~~Issue 1 (pagination)~~ — Done
7. ~~Issue 5 (batch entry redesign)~~ — Done
8. ~~Import FY resolution~~ — Done (2026-08-31)
9. ~~Review & merge PRs #11 + #12~~ — Done
