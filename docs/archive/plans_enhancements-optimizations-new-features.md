# VAT Expense Ledger — Enhancements, Optimizations & New Features Plan

> Generated from a comprehensive codebase audit across UI/UX, backend/API, code quality, and test coverage.

---

## Part 1: Enhancements, Refinements & Optimizations

### P0 — Security & Data Integrity (Critical)

#### 1. Truck PATCH route bypasses Zod validation
- **File:** `src/app/api/trucks/[id]/route.ts:23-28`
- **Problem:** Manually inspects `body as Record<string, unknown>` and does raw `typeof` checks instead of using `updateTruckSchema.safeParse()`. Every other PATCH route uses Zod validation. This means the `ownerName` field accepts any type (object, number, etc.).
- **Fix:** Replace manual field extraction with `safeParse(updateTruckSchema, body)` and return `unprocessableEntity` on failure, matching the pattern in `categories/[id]`, `locations/[id]`, etc.

#### 2. SuperAdmin company ID from query string not validated
- **File:** `src/lib/api-auth.ts:31-35`
- **Problem:** When the user is a SuperAdmin, `companyId` is taken directly from the query parameter without verifying it exists in the database. A superadmin can pass any arbitrary UUID and operate on a non-existent company.
- **Fix:** After extracting `companyId` from the query string, look up the company in the DB and return `notFound()` if it doesn't exist.

#### 3. Fiscal year POST doesn't deactivate other active FYs
- **File:** `src/app/api/fiscal-years/route.ts:51-57`
- **Problem:** The POST handler hardcodes `isActive: true` without deactivating other active fiscal years for the company. The service layer (`src/lib/services/fiscal-years.ts:30-36`) correctly deactivates them inside a transaction, but the route doesn't delegate to the service.
- **Fix:** Either delegate to `createFiscalYear()` from the service layer, or add the deactivation step before insert.

#### 4. DELETE expense doesn't check rowVersion
- **File:** `src/app/api/expenses/[id]/route.ts:145-171`
- **Problem:** The PATCH handler enforces optimistic concurrency via `rowVersion`, but the DELETE handler does not. Two concurrent users could delete/edit-delete the same expense, causing a stale delete to override a concurrent edit.
- **Fix:** Accept an optional `rowVersion` in the DELETE request body and include `eq(expenses.rowVersion, current.rowVersion)` in the WHERE clause, returning a conflict if the version doesn't match.

#### 5. Expense POST doesn't populate `createdBy`/`updatedBy`
- **File:** `src/app/api/expenses/route.ts:212-233`
- **Problem:** The `expenses` schema has `createdBy` and `updatedBy` columns, but the POST handler never populates them. The session user ID is available from `requireCompanyIdFromSession`. Audit tracing is incomplete.
- **Fix:** Extract the user ID from the session and set `createdBy` and `updatedBy` on insert. Similarly, set `updatedBy` on PATCH.

---

### P1 — Performance & Correctness (High)

#### 6. Expense POST: 5 sequential independent lookups
- **File:** `src/app/api/expenses/route.ts:142-197`
- **Problem:** The POST handler runs company lookup, FY resolution, party lookup, invoice duplicate check, and suspicious duplicates sequentially. Steps 1-3 are independent and could be parallelized with `Promise.all`. Steps 4 and 5 are also independent.
- **Fix:** Use `Promise.all` for the company + fiscal year + party lookups. Also consider combining the two duplicate checks.

#### 7. Reports: 2 DB queries where 1 would suffice
- **Files:** `src/app/api/reports/monthly/route.ts:38-61`, `src/app/api/reports/fiscal-year/route.ts:32-53`
- **Problem:** The monthly report fetches category breakdown (GROUP BY category) then separately fetches totals (aggregate over all). Two queries over the same data.
- **Fix:** Compute totals from the category breakdown rows in JavaScript, or use a SQL window function `SUM(...) OVER()` to get both in one query.

#### 8. Export FY detail: 12 sequential queries (one per month)
- **File:** `src/app/api/export/fiscal-year/route.ts:42-139`
- **Problem:** The detailed fiscal year export runs a separate DB query for each of the 12 Nepali months in a `for` loop.
- **Fix:** Fetch all expenses for the fiscal year in a single query, then group by month in JavaScript. Reduces 12 queries to 1.

#### 9. Import preview loads ALL expenses for cross-DB duplicate detection
- **File:** `src/app/api/import/[batchId]/preview/route.ts:339-351`
- **Problem:** The cross-DB duplicate detection fetches ALL expenses for the company+FY without `isDeleted = false` filter or party scoping. For a large ledger this returns thousands of unnecessary rows.
- **Fix:** Add `eq(expenses.isDeleted, false)` to the WHERE clause and filter only by the specific party+invoice pairs being imported.

#### 10. No duplicate detection on PATCH expense
- **File:** `src/app/api/expenses/[id]/route.ts:44-143`
- **Problem:** When an expense is PATCHed (changing invoice number, party, or amounts), duplicate detection is not re-run. A user could change fields to match another expense, creating a logical duplicate.
- **Fix:** After computing the merged expense, rebuild the fingerprint and run `checkInvoiceDuplicate` + `findSuspiciousDuplicates` (same as POST).

---

### P2 — Code Quality & DRY (Medium)

#### 11. Expense CRUD logic duplicated between API route and server action
- **Files:** `src/app/api/expenses/route.ts` POST (126-239), `src/app/api/expenses/[id]/route.ts` PATCH (44-142), `src/lib/actions/expenses.ts`, `src/lib/actions/expenses-helpers.ts`
- **Problem:** Two complete code paths for expense create/update. The API route does inline logic (~110 lines); the server action uses `prepareValidatedExpense`. Bug fixes must be applied in both places.
- **Fix:** Refactor the API routes to delegate to the shared `prepareValidatedExpense` helper or the server action functions, eliminating the duplication.

#### 12. Master entity create logic duplicated between routes and services
- **Files:** `src/app/api/categories/route.ts:40-58`, `locations/route.ts:40-58`, `trucks/route.ts:40-58`, `parties/route.ts:37-92` vs their respective `src/lib/services/*.ts`
- **Problem:** POST handlers do inline duplicate-detection + insert instead of calling the service layer's `createCategory()`, `createLocation()`, etc.
- **Fix:** Have API POST routes delegate to the service layer to eliminate duplication and ensure consistent behavior.

#### 13. `updateTruckSchema` defined but never used
- **File:** `src/lib/validation/masters.ts:71-76`
- **Problem:** `updateTruckSchema` is defined and exported but never imported. The `trucks/[id]` route does manual field inspection instead (also issue #1).
- **Fix:** Use the schema in the truck PATCH route (addresses issue #1 simultaneously).

#### 14. Duplicate `ServiceResult<T>` type
- **Files:** `src/lib/types.ts:44`, `src/lib/services/types.ts:3`
- **Problem:** Identical `ServiceResult<T>` type defined in two places. All services import from `./types`; the copy in `lib/types.ts` appears unused.
- **Fix:** Remove the duplicate from `lib/types.ts` or re-export from a single source.

#### 15. Unused `ListItem` interfaces and `formatMiti` function
- **Files:** `src/lib/types.ts:3-42` (`PartyListItem`, `CategoryListItem`, `LocationListItem`, `FiscalYearListItem`), `src/lib/format.ts:25-27` (`formatMiti`)
- **Problem:** These exports are never imported anywhere in the codebase.
- **Fix:** Remove dead code.

#### 16. Sidebar active-route highlighting fails for sub-routes
- **File:** `src/components/layout/sidebar.tsx:108-112`
- **Problem:** The `active` prop uses exact path matching (`pathname === item.href`). Navigating to `/expenses/abc123` doesn't highlight "Expenses"; navigating to `/reports/monthly` doesn't highlight "Monthly Report".
- **Fix:** Use `pathname.startsWith(item.href)` for non-root items, or implement a route-matching utility that handles nested paths (excluding `/` which should remain exact).

#### 17. Expense form re-implements VAT calculation logic
- **File:** `src/components/expenses/expense-form.tsx:149-173`
- **Problem:** `calcFromTaxable`/`calcFromTotal` are reimplemented locally with `VAT_RATE` and `VAT_FACTOR` instead of importing from `src/lib/expenses/ledger-calculation.ts`.
- **Fix:** Import and use the canonical implementations from `ledger-calculation.ts`.

---

### P3 — UX Polish (Low-Medium)

#### 18. ConfirmDialog lacks focus trap and click-outside-to-close
- **File:** `src/components/ui/confirm-dialog.tsx:29-68`
- **Problem:** The dialog focuses the cancel button on open but doesn't trap focus. A user can Tab out into background content. No click-on-backdrop-to-close.
- **Fix:** Add a focus trap cycling through focusable elements. Add onClick on the backdrop to call `onCancel`.

#### 19. MasterPage toggleActive has no confirmation dialog
- **File:** `src/components/master-page.tsx:165-177`
- **Problem:** Clicking the Active/Inactive badge immediately toggles status via API with no confirmation. Accidental clicks could deactivate entities in active use.
- **Fix:** Show a `ConfirmDialog` before toggling, especially for deactivation.

#### 20. No unsaved-changes warning on expense form navigation
- **File:** `src/components/expenses/expense-form.tsx`
- **Problem:** If a user fills out the expense form and navigates away, all entered data is silently lost. No `beforeunload` handler or route-change guard.
- **Fix:** Use `beforeunload` event and Next.js `useBlocker` or `routeChangeStart` to warn about unsaved changes.

#### 21. Monthly report month selector is at the bottom of the page
- **File:** `src/app/reports/monthly/page.tsx:129`
- **Problem:** The `MonthSelector` is rendered below the category table. Users must scroll past all data to switch months.
- **Fix:** Move `MonthSelector` to the header area, or add previous/next month arrows beside the title.

#### 22. Report rows not clickable for drill-down
- **Files:** `src/app/reports/monthly/page.tsx`, `src/app/reports/fiscal-year/page.tsx`, `src/app/reports/parties/page.tsx`
- **Problem:** Report rows (categories, months, parties) are not clickable. Users can't navigate to the underlying expenses.
- **Fix:** Make report rows clickable links that navigate to `/expenses` with appropriate filters pre-applied (e.g., `?categoryId=X&month=Y`).

#### 23. Confusing navigation labels: "Add Expense" vs "New Expense"
- **File:** `src/components/layout/nav-config.ts:20-21`
- **Problem:** Sidebar has both "Add Expense" (ledger grid) and "New Expense" (single form). Names are nearly identical and their difference is unclear.
- **Fix:** Rename to clarify: e.g., "Batch Entry" and "Single Expense", or "Ledger" and "Quick Add".

#### 24. Toast messages lack dismiss buttons
- **File:** `src/components/ui/toast.tsx:48-63`
- **Problem:** Toasts auto-dismiss after 3 seconds with no manual dismiss. Important error messages may disappear before the user reads them.
- **Fix:** Add a close/dismiss button (X icon) to each toast. Extend timeout for error toasts to 5-8 seconds.

#### 25. No client-side file size/type validation before upload
- **File:** `src/app/import/page.tsx:139-173`
- **Problem:** The file input accepts `.xlsx`, `.xls`, `.csv` but performs no client-side validation on file size or actual type before sending to server. A 500MB file would fully upload before failing.
- **Fix:** Add client-side checks: max file size (e.g., 10MB), validate extension matches accept list before calling API.

#### 26. Delete confirmation message has confusing wording
- **File:** `src/components/expenses-list-client.tsx:319`
- **Problem:** Says "This action cannot be undone from the database only." Grammatically awkward and unclear.
- **Fix:** Rephrase to "This will permanently delete this expense. This action cannot be undone."

#### 27. Error display lacks consistent alert styling
- **Files:** `src/components/master-page.tsx:378`, `src/app/import/page.tsx:294`
- **Problem:** Error messages displayed as plain red text `<p>` instead of the styled `Alert` component used elsewhere.
- **Fix:** Replace with `<Alert kind="danger">{error}</Alert>`.

#### 28. MasterPage `title.slice(0, -1)` toast is fragile
- **File:** `src/components/master-page.tsx:115`
- **Problem:** Derives singular form by slicing the last character. "Parties" -> "Partie" (wrong). "Fiscal Years" -> "Fiscal Year" (correct). Fragile for edge cases.
- **Fix:** Accept an optional `singularName` prop.

#### 29. No loading skeleton states
- **Files:** All page components
- **Problem:** Every page shows "Loading..." text or nothing during load. No skeleton/shimmer placeholders.
- **Fix:** Create a `Skeleton` component and use it in `MasterPage`, dashboard, report pages, and expense form option loading.

#### 30. Pagination has no jump-to-page or page-size selector
- **File:** `src/components/expenses-list-client.tsx:292-313`
- **Problem:** Only Previous/Next buttons. With 50 items per page and potentially hundreds of pages, navigating to a specific page is tedious.
- **Fix:** Add a page number input or page-size selector (25 / 50 / 100 per page).

#### 31. Admin users have no navigation back to regular features
- **File:** `src/components/layout/nav-config.ts:46-56`
- **Problem:** Super-admin only sees "Admin Dashboard" nav group. No way to navigate to regular features without manually editing the URL.
- **Fix:** Add regular nav groups alongside the admin group for super-admin users, or add a "Switch to user view" link.

#### 32. Dashboard lacks comparison with previous fiscal year
- **File:** `src/components/dashboard-client.tsx`
- **Problem:** Shows current fiscal year totals but no context about whether spending is up or down vs previous year.
- **Fix:** If a previous FY exists, show percentage change indicator (e.g., "+12% vs last year") on stat cards.

#### 33. Recent expenses "view all" link missing on dashboard
- **File:** `src/components/dashboard-client.tsx:92-143`
- **Problem:** Shows 5 recent expenses but no "View all expenses" link in the section.
- **Fix:** Add a "View all expenses" link at the bottom of the recent expenses section.

#### 34. Master pages show no usage counts
- **Files:** `src/app/categories/page.tsx:23`, `src/app/locations/page.tsx:25`, `src/app/trucks/page.tsx:16`
- **Problem:** All three pass `columns={[]}` to `MasterPage`, so only the name is shown. Users can't see how many expenses reference each entity.
- **Fix:** Add columns showing reference counts (e.g., "Used in 42 expenses").

#### 35. Import preview has no mobile view
- **File:** `src/app/import/page.tsx:399`
- **Problem:** Preview DataTable uses `variant="desktop-only"`, hidden on mobile. Phone/tablet users can't review import data.
- **Fix:** Switch to `variant="responsive"` with `mobileCard` renderer, or add a clear message that import preview is desktop-only.

#### 36. No keyboard shortcut for saving in expense form
- **File:** `src/components/expenses/expense-form.tsx`
- **Problem:** Ledger grid shows `Ctrl+Enter` shortcut but the single expense form has none. Power users must use the mouse.
- **Fix:** Add `useEffect` listening for `Ctrl+Enter`/`Cmd+Enter` to trigger form submission.

#### 37. No skip-to-content link for keyboard/screen-reader users
- **File:** `src/components/layout/app-shell.tsx`
- **Problem:** No skip navigation link. Keyboard users must tab through all nav items to reach page content.
- **Fix:** Add a visually hidden "Skip to content" link as the first element.

#### 38. Expense detail page has no breadcrumbs
- **File:** `src/app/expenses/[id]/page.tsx`
- **Problem:** Shows "Edit expense" with no navigation context back to expenses list.
- **Fix:** Add breadcrumbs: "Expenses > Edit [miti date]" or at minimum a "Back to expenses" link.

#### 39. MessageList uses first message's tone for all messages
- **File:** `src/components/ui/alert.tsx:47-56`
- **Problem:** Determines alert tone from `messages[0].kind` and applies to entire container. Mixed warnings+success all display in first message's color.
- **Fix:** Render each message with its own tone, or group by kind into separate alert boxes.

---

## Part 2: New Features

### Feature A: Expense PDF/Invoice Export
Export individual expenses or batches as PDF invoices with company branding, BS dates, and VAT breakdown.

**Scope:**
- New API route: `src/app/api/expenses/[id]/export/route.ts` - generates PDF for single expense
- New API route: `src/app/api/export/expenses/route.ts` - generates PDF for filtered expense list
- Use a lightweight PDF library (`jspdf` or `@react-pdf/renderer`)
- Include: company name/logo, VAT number, expense details, BS date, amounts in both figures and (optionally) Nepali words
- Add "Export PDF" button on expense detail page and expense list (bulk selection)

**Dependencies:** None

---

### Feature B: Dashboard Charts
Add visual charts to the dashboard for spending trends and category breakdowns.

**Scope:**
- Install `recharts` (lightweight, React-native charting)
- New component: `src/components/dashboard-charts.tsx`
  - **Monthly spending bar chart** - shows expense totals per Nepali month for active FY
  - **Category pie/donut chart** - shows spending breakdown by category
  - **Party spending comparison** - horizontal bar chart of top 10 parties
- Integrate into `src/components/dashboard-client.tsx` below stat cards
- Fetch data from existing report APIs or new aggregation endpoint
- Responsive: charts stack on mobile

**Dependencies:** None

---

### Feature C: Party Statement Report
A per-party financial statement showing all transactions in a fiscal year with running totals.

**Scope:**
- New page: `src/app/reports/parties/[id]/page.tsx`
- New API route: `src/app/api/reports/parties/[id]/route.ts`
- New server-data function: `src/lib/server-data/party-statement.ts`
- Display: party name, VAT number, fiscal year, chronological list of expenses with columns (Miti, Invoice, Item, Taxable, VAT, Total), running taxable/VAT/total subtotals
- Export to Excel (reuse existing export patterns)
- Add clickable party rows in existing party report to navigate here

**Dependencies:** None

---

### Feature D: Bulk Operations on Expenses
Select multiple expenses via checkboxes and perform batch actions.

**Scope:**
- Modify `src/components/expenses-list-client.tsx`:
  - Add checkbox column to expense table
  - Add "Select All" checkbox in header
  - Add bulk action toolbar (appears when selection > 0): "Delete Selected", "Export Selected (Excel)", "Change Category"
- New API route: `src/app/api/expenses/bulk/route.ts`
  - `POST /api/expenses/bulk/delete` - soft-deletes multiple expenses by IDs
  - `POST /api/expenses/bulk/category` - reassigns category for multiple expenses
- Add confirmation dialog before bulk delete
- Show count of selected items and affected rows

**Dependencies:** None

---

### Feature E: Expense Templates / Recurring Expenses
Save common expense patterns as templates and generate expenses from them.

**Scope:**
- New schema: `expense_templates` table (id, companyId, name, partyId, categoryId, locationId, truckId, item, quantity, rate, vatRate)
- New migration
- New service: `src/lib/services/expense-templates.ts`
- New API routes: `src/app/api/expense-templates/` (CRUD)
- New page: `src/app/expense-templates/page.tsx` - list and manage templates
- "Save as Template" button on expense detail page
- "Create from Template" button/shortcut on expense create page - pre-fills form from template
- Optional: recurring schedule (monthly, weekly) with auto-generation via a cron/background job

**Dependencies:** None

---

### Feature F: User Management & Role UI
Admin page for managing users within a company.

**Scope:**
- New page: `src/app/admin/users/page.tsx`
- New API routes:
  - `GET /api/admin/users` - list users for a company
  - `PATCH /api/admin/users/[id]` - change role (Admin, DataEntry)
  - `DELETE /api/admin/users/[id]` - deactivate user (set `isActive: false`)
- Modify existing `POST /api/admin/companies` to also accept an optional `users` array for inviting multiple users during company creation
- Role-based access: only Admin/SuperAdmin can manage users
- Display: user email, name, role badge, active/inactive status, last login (if tracked)

**Dependencies:** None

---

### Feature G: Audit Trail / Activity Log
Track who created/modified/deleted expenses and master entities.

**Scope:**
- New schema: `audit_logs` table (id, companyId, entityType, entityId, action, changes JSONB, performedBy, createdAt)
- New migration
- Populate `createdBy`/`updatedBy` on expenses (prerequisite: fix #5 above)
- Add audit logging middleware or helper: `src/lib/audit.ts`
  - `logAudit(companyId, entityType, entityId, action, changes, userId)`
- Wire into all expense CRUD operations (create, update, delete)
- Wire into master entity CRUD operations (create, update, delete)
- New page: `src/app/admin/audit-log/page.tsx` - filterable table of audit events
- New API route: `src/app/api/admin/audit-log/route.ts` - paginated query with filters (entityType, action, date range, user)

**Dependencies:** Fix #5 (populate `createdBy`/`updatedBy`) should be done first.

---

### Feature H: Multi-Company Dashboard (SuperAdmin)
SuperAdmin view showing all companies with aggregated stats.

**Scope:**
- New page: `src/app/admin/companies-overview/page.tsx`
- New API route: `src/app/api/admin/companies-overview/route.ts`
- Display: table/cards for each company showing:
  - Company name, VAT number
  - Total expenses count and amount (current FY)
  - Number of parties, categories, locations
  - Last activity date
  - Active/inactive status
- Click-through to company-specific views (set companyId in session/query)
- Summary row at top: total companies, total expenses across all, total VAT

**Dependencies:** None

---

## Implementation Order Recommendation

### Phase 1: Security & Data Integrity (P0)
Issues #1-#5 - Critical fixes that should be done first.

### Phase 2: Performance & Correctness (P1)
Issues #6-#10 - High-impact improvements.

### Phase 3: Code Quality & DRY (P2)
Issues #11-#17 - Reduce maintenance burden.

### Phase 4: UX Polish (P3)
Issues #18-#39 - Pick based on priority/user impact. Suggested order:
1. #16 (sidebar highlighting) - quick win, high visibility
2. #19 (confirm dialog on toggle) - prevents data accidents
3. #22 (report drill-down) - high value feature enhancement
4. #21 (month selector position) - quick win
5. #20 (unsaved changes warning) - prevents data loss
6. #23 (nav label clarity) - quick win
7. #24 (toast dismiss) - quick win
8. #25 (file size validation) - prevents upload issues
9. #30 (pagination controls) - usability improvement
10. Remaining items as time permits

### Phase 5: New Features
Pick based on business value. Suggested order:
1. **Feature B: Dashboard Charts** - high visibility, moderate effort
2. **Feature A: PDF Export** - high business value for Nepal VAT compliance
3. **Feature C: Party Statement** - high value for reconciliation
4. **Feature D: Bulk Operations** - productivity improvement
5. **Feature G: Audit Trail** - compliance requirement
6. **Feature F: User Management** - admin usability
7. **Feature E: Expense Templates** - productivity for recurring entries
8. **Feature H: Multi-Company Dashboard** - SuperAdmin convenience

---

## Effort Estimates

| Category | Issues | Estimated Effort |
|----------|--------|-----------------|
| P0 Security & Data Integrity | #1-#5 | ~2-3 hours |
| P1 Performance & Correctness | #6-#10 | ~3-4 hours |
| P2 Code Quality & DRY | #11-#17 | ~4-5 hours |
| P3 UX Polish | #18-#39 | ~6-8 hours |
| Feature A: PDF Export | | ~4-6 hours |
| Feature B: Dashboard Charts | | ~3-4 hours |
| Feature C: Party Statement | | ~3-4 hours |
| Feature D: Bulk Operations | | ~4-5 hours |
| Feature E: Expense Templates | | ~5-7 hours |
| Feature F: User Management | | ~3-4 hours |
| Feature G: Audit Trail | | ~6-8 hours |
| Feature H: Multi-Company Dashboard | | ~3-4 hours |

**Total estimated effort:** ~46-62 hours
