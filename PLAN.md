# VATExpense — Enhancement Plan & TODO

Single tracking document for planned work, open PRs, and completed changes. Both user and agents append items here. Mark items `- [x]` when done.

---

## Open PRs (Review)

### PR #12 — `feature/backend-audit` (2 commits, Phase 1+2)
- **Phase 1 (security):** gate companies API, scope party-statement, enforce import size limits, sanitize CSV exports, validate FK ownership.
- **Phase 2 (data integrity):** FY membership check, atomic import confirm, delete 409, transactional expense-create, amount validation.
- **Files changed:** 31 (API routes, services, tests, validation, exports, format, party-statement).
- **Review status:** No review yet.
- **Action needed:** Review changes, confirm no conflicts with recent main, decide merge.

### PR #11 — `feature/phase3-audit-hardening` (1 commit, Phase 3)
- **Scope:** Auth hardening (rate-limiter on login attempts, reject default superadmin creds, session sync), invoice normalization (trim+lowercase), duplicate-conflict handling via `isUniqueViolation`, ledger validation (invalid taxable amounts rejected, saving-row edit lock), VAT-rate propagation, fiscal-year creation transactional.
- **Files changed:** 26 (auth, actions, reducers, validation, migrations, tests, ledger, useApp).
- **Review status:** CodeRabbit — **Merge Risk: CRITICAL**, 12 actionable comments.
- **Key findings to address before merge:**
  - 🔴 `src/auth.ts` — unbounded `loginAttempts` `Map` can exhaust memory (unique emails accumulate). Replace with TTL-backed limiter + max key count.
  - 🔴 `src/lib/actions/common.ts` — `inputCompanyId` accepted when unauthenticated (`user` is `undefined`). Require `ROLE_SUPER_ADMIN` for this path.
  - 🟠 `src/app/api/expenses/invoice-keys/route.ts` — 10k-row limit silently truncates invoice keys. Add pagination or use server-side duplicate detection as authority.
  - 🟠 `src/app/api/admin/companies/[id]/fiscal-years/route.ts` — concurrent FY inserts hit DB unique violation but catch returns `internalError()`. Map `23505` to `conflict()`.
  - 🟠 `src/lib/expenses/ledger-reducer.ts` — `AUTO_FIX` still modifies rows with `STATUS_SAVING`. Guard it.
  - 🟠 VAT-rate consistency — `defaultVatRate` not propagated to `ledger-calculation.ts` (uses hardcoded `VAT_RATE`), displayed amounts may differ from persisted `vatRate`.
  - 🟡 Migration `0007_normalize_invoice_lowercase.sql` — `CREATE UNIQUE INDEX` blocks writes; consider `CONCURRENTLY`. Also schema not updated to match `lower(invoiceNumber)`.
- **Action needed:** Fix critical + major findings, re-review, then merge.

### Recommended Order
1. Merge #12 (backend-audit, cleaner diff, no critical review findings).
2. Address #11 CodeRabbit findings.
3. Merge #11.

---

## TODO

- [ ] **Review & merge open PRs #11 and #12** — see Open PRs section above for details and recommended order. | Priority: high | Files: `src/auth.ts`, `src/lib/actions/common.ts`, `src/app/api/expenses/invoice-keys/route.ts`, `src/app/api/admin/companies/[id]/fiscal-years/route.ts`, `src/lib/expenses/ledger-reducer.ts`, `src/lib/db/schema.ts`, `src/lib/db/migrations/0007_normalize_invoice_lowercase.sql`

- [ ] **Per-row fiscal year resolution in import** — resolve each row's FY from its miti, auto-create if missing. Deferred by user. | Priority: high | Files: `src/app/api/import/[batchId]/confirm/route.ts`, `preview/route.ts`

- [ ] **Smart Fix button** — hide when error is not auto-fixable (only show for: missing miti, invalid date, missing category, FY not found). | Priority: medium | Files: `src/lib/expenses/ledger-validation.ts`, `src/lib/expenses/ledger-reducer.ts`, `src/components/expenses/ledger-table.tsx`

- [ ] **Batch entry form redesign** — sticky mobile action bar, empty state icon + button, alternating row backgrounds. | Priority: low | Files: `src/components/expenses/ledger-grid.tsx`, `src/components/expenses/ledger-table.tsx`

- [ ] **Navigation active state** — ensure child items use exact match for active detection. | Priority: low | Files: `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`

---

## Completed

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
**Status:** Deferred. All rows use `batch.fiscalYearId`. Planned: resolve from `resolvedMiti` via `resolveFiscalYear`, group by FY, insert in batches.

#### Batch Entry Form Redesign
**Status:** Partially complete. Still needed: sticky mobile action bar, empty state, alternating rows.

#### Smart Fix Button
**Status:** Not started. Only show Fix for: missing miti (→ today's BS date), invalid date (→ today), missing category (→ General), FY not found (→ auto-create).

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
9. **Review & merge PRs #11 + #12** — NEW, high priority
