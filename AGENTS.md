<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Project Overview

VAT Expense Ledger — a purchase invoice register built for Nepali fiscal-year reporting. Tracks expenses by party, category, location, and Nepali month. Supports CSV/Excel import with auto-resolution of parties, categories, and locations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.0 (App Router) |
| UI | React 19.2.8, Tailwind CSS v4 |
| Database | PostgreSQL (Neon or local) via Drizzle ORM 0.45 |
| Auth | NextAuth v5 (Credentials provider, JWT strategy) |
| Validation | Zod 4 |
| Testing | Vitest (412 tests, 25 files) |
| Package manager | pnpm |

---

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (port 3000) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (watch mode) |
| `pnpm test:run` | Vitest (single run) |
| `pnpm test:coverage` | Vitest with coverage |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed database with test data |

---

## Environment Variables

Set in `.env.local` (copy from `.env.example`):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth secret (`openssl rand -base64 32`) |
| `SUPERADMIN_EMAIL` | No | Superadmin login (env-based, no DB row) |
| `SUPERADMIN_PASSWORD` | No | Superadmin password |
| `ALLOW_DB_RESET` | No | Enable `POST /api/admin/reset` (truncates all data) |

---

## Project Structure

```
src/
├── app/                              # Next.js App Router pages
│   ├── page.tsx                      # Dashboard (redirects superadmin to /admin)
│   ├── layout.tsx                    # Root layout — AppShell wraps everything
│   ├── login/                        # Login page (unauthenticated)
│   ├── expenses/                     # Expense list + create + edit
│   │   ├── page.tsx                  # Expenses list (server component, paginated)
│   │   ├── create/page.tsx           # Create expense form
│   │   ├── [id]/page.tsx             # Edit expense
│   │   └── new/page.tsx              # Alias → redirects to /expenses
│   ├── import/                       # CSV/Excel import pipeline
│   │   ├── page.tsx                  # Upload → preview → confirm flow (client)
│   │   ├── types.ts                  # BatchRow, BatchPreview, ImportResult types
│   │   ├── import-preview-table.tsx  # Preview DataTable component
│   │   └── import-issue-summary.tsx  # Error/warning breakdown component
│   ├── reports/                      # Report pages
│   │   ├── fiscal-year/              # Fiscal year summary
│   │   ├── monthly/                  # Monthly breakdown
│   │   └── parties/                  # Party statement + party detail
│   ├── admin/                        # Superadmin-only area
│   │   ├── layout.tsx                # Server layout — blocks non-superadmins
│   │   ├── page.tsx                  # Admin overview dashboard
│   │   ├── companies/                # Company CRUD
│   │   ├── users/                    # User CRUD + password reset
│   │   ├── fiscal-years/             # Fiscal year CRUD
│   │   └── audit-log/                # Audit trail
│   ├── categories/                   # Master page (MasterPage component)
│   ├── locations/                    # Master page
│   ├── parties/                      # Master page (with party detail modals)
│   ├── trucks/                       # Master page
│   │   └── [id]/documents/           # Truck documents page
│   ├── fiscal-years/                 # Master page
│   └── api/                          # API routes
│       ├── auth/[...nextauth]/       # NextAuth handler
│       ├── companies/                # Company CRUD
│       ├── fiscal-years/             # Fiscal year CRUD
│       ├── expenses/                 # Expense CRUD + invoice-keys
│       ├── parties/                  # Party CRUD + by-vat lookup
│       ├── categories/               # Category CRUD
│       ├── locations/                # Location CRUD
│       ├── trucks/                   # Truck CRUD
│       ├── reports/                  # Report data APIs
│       ├── export/                   # CSV/Excel export APIs
│       ├── import/                   # Import pipeline APIs
│       │   ├── excel/route.ts        # Upload + parse spreadsheet → batch
│       │   └── [batchId]/
│       │       ├── preview/route.ts  # Resolve rows (party/cat/loc/miti/amounts)
│       │       ├── confirm/route.ts  # Insert expenses from valid rows
│       │       └── rows/[rowId]/     # PATCH: apply suggestion to a row
│       ├── item-categories/          # Item-category link CRUD
│       ├── truck-documents/          # Truck document CRUD
│       └── admin/                    # Superadmin-only APIs
│           ├── companies/
│           ├── users/
│           ├── fiscal-years/
│           ├── reset/                # Truncate all data
│           └── audit-log/
├── components/
│   ├── expenses/                     # Expense entry components
│   │   ├── expense-form.tsx          # Single expense create/edit form
│   │   ├── expense-party-autocomplete.tsx  # Party autocomplete for expense form
│   │   ├── item-autocomplete.tsx     # Item autocomplete with category links
│   │   ├── item-link-modal.tsx       # Modal to create item-category link
│   │   ├── ledger-grid.tsx           # Batch entry ledger (reducer-driven)
│   │   ├── ledger-table.tsx          # Ledger table (desktop + mobile cards)
│   │   ├── ledger-summary.tsx        # Totals row
│   │   ├── ledger-actions.tsx        # Add/delete/duplicate row buttons
│   │   ├── party-autocomplete.tsx    # Party dropdown with autocomplete (ledger)
│   │   ├── status-badge.tsx          # Row status indicator
│   │   └── batch-entry.tsx           # Wrapper: loads FY + renders LedgerGrid
│   ├── layout/                       # Navigation shell
│   │   ├── app-shell.tsx             # Responsive shell (sidebar + content + providers)
│   │   ├── sidebar.tsx               # Desktop sidebar navigation
│   │   ├── mobile-nav.tsx            # Mobile header + bottom tab bar + report picker
│   │   ├── icons.tsx                 # SVG icon components
│   │   ├── nav-config.ts             # Navigation item definitions and grouping
│   │   ├── nav-styles.ts             # Shared nav CSS classes
│   │   └── useSidebarCollapsed.ts    # Sidebar collapse state (localStorage)
│   ├── admin/                        # Admin panel components
│   │   ├── companies-page.tsx        # Companies list + ProvisionPanel + CompanyEditPanel
│   │   ├── users-page.tsx            # Users list + UserFormPanel + ResetPasswordPanel
│   │   ├── fiscal-years-page.tsx
│   │   ├── fiscal-years-section.tsx
│   │   ├── provision-panel.tsx       # New company slide-over
│   │   ├── company-edit-panel.tsx    # Edit company slide-over
│   │   ├── user-form-panel.tsx       # New/edit user slide-over
│   │   ├── reset-password-panel.tsx
│   │   ├── audit-log-page.tsx
│   │   ├── admin-sidebar.tsx
│   │   └── admin-overview.tsx
│   ├── ui/                           # Shared primitives
│   │   ├── modal.tsx                 # Shared modal (center + right, portaled to body)
│   │   ├── slide-over.tsx            # Thin wrapper: Modal with position="right"
│   │   ├── confirm-dialog.tsx        # Destructive-action confirmation modal
│   │   ├── toast.tsx                 # Toast notification system
│   │   ├── alert.tsx                 # Inline alert + MessageList
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── data-table.tsx            # Generic sortable table
│   │   ├── field.tsx                 # Form field primitives (Input, Select, etc.)
│   │   ├── pagination.tsx            # Page numbers + page size selector
│   │   ├── empty-state.tsx
│   │   ├── skeleton.tsx
│   │   ├── page-skeleton.tsx
│   │   ├── page-header.tsx
│   │   ├── stat-card.tsx
│   │   ├── status-widgets.tsx
│   │   ├── status-dot.tsx
│   │   └── nav-select.tsx
│   ├── categories/                   # Categories page components
│   │   ├── categories-table.tsx      # Categories CRUD table
│   │   └── item-links-table.tsx      # Item-category links CRUD table
│   ├── parties/                      # Parties page components
│   │   └── parties-page.tsx          # Standalone parties page with React Query
│   ├── master-page.tsx               # Reusable CRUD page (categories, locations, etc.)
│   ├── party-form-modal.tsx          # Slide-over for creating/editing a party
│   ├── location-form-modal.tsx       # Modal for creating a location
│   ├── expense-detail-client.tsx     # Expense detail view (client)
│   ├── expenses-list-client.tsx      # Expenses list (client, paginated)
│   ├── dashboard-client.tsx          # Dashboard summary
│   ├── fiscal-year-selector.tsx
│   ├── month-selector.tsx
│   ├── *-export.tsx                  # Export components (monthly, party, fiscal-year, party-statement)
│   └── admin/user-avatar.tsx, role-badge.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema (all tables)
│   │   ├── index.ts                  # DB driver (neon-serverless for prod, postgres-js for local)
│   │   └── migrations/               # SQL migration files (0000–0012)
│   ├── actions/                      # Server actions ("use server")
│   │   ├── common.ts                 # requireCompanyId, ActionResult type
│   │   ├── expenses.ts               # Batch save, create, update, delete expenses
│   │   ├── expenses-helpers.ts       # resolveFiscalYear, loadExpenseReferences, prepareValidatedExpense
│   │   ├── fiscal-years.ts           # CRUD + setActiveFiscalYear
│   │   ├── companies.ts
│   │   ├── categories.ts
│   │   ├── locations.ts
│   │   ├── parties.ts
│   │   └── trucks.ts
│   ├── server-data/                  # RSC data loaders (called in server components)
│   │   ├── index.ts                  # Re-exports all
│   │   ├── companies.ts
│   │   ├── fiscal-years.ts
│   │   ├── masters.ts
│   │   ├── expenses.ts
│   │   ├── reports.ts
│   │   └── party-statement.ts
│   ├── services/                     # CRUD service layer (used by actions + admin APIs)
│   │   ├── types.ts                  # ServiceResult<T>
│   │   ├── companies.ts
│   │   ├── fiscal-years.ts           # createFiscalYear (with duplicate detection)
│   │   ├── categories.ts
│   │   ├── parties.ts
│   │   ├── locations.ts
│   │   └── trucks.ts
│   ├── expenses/                     # Expense domain logic
│   │   ├── ledger-types.ts           # LedgerRow, LedgerAction types
│   │   ├── ledger-reducer.ts         # State machine for batch entry
│   │   ├── ledger-calculation.ts     # VAT calc: calcFromTaxable, calcFromTotal
│   │   ├── ledger-validation.ts      # Row validation + smart fix actions
│   │   ├── ledger-utils.ts           # Ledger utility functions
│   │   └── duplicates.ts             # checkInvoiceDuplicate, findSuspiciousDuplicates
│   ├── db-helpers/                   # Shared DB query helpers
│   │   ├── entities.ts               # findFiscalYearByIdAndCompany, findPartyByIdAndCompany
│   │   ├── masters.ts                # loadActiveMasterData (parties, categories, locations)
│   │   ├── expenses.ts
│   │   └── parties.ts
│   ├── hooks/                        # React Query hooks
│   │   └── use-reference-data.ts     # useReferenceData, useItemCategories hooks
│   ├── types/                        # Shared TypeScript types
│   │   └── entities.ts               # Category, Location, Truck, Party, ItemCategoryLink
│   ├── validation/                   # Zod schemas
│   │   ├── expense.ts                # expenseInputSchema, validateAmounts
│   │   ├── masters.ts                # Party, category, location, truck validation
│   │   ├── admin.ts                  # Company, user validation
│   │   └── utils.ts                  # safeParse helper
│   ├── api-response.ts               # apiOk, badRequest, notFound, conflict, etc.
│   ├── api-client.ts                 # api() fetch wrapper, ApiError class, apiUrl()
│   ├── api-auth.ts                   # requireCompanyIdFromSession, getSessionUser
│   ├── useApp.tsx                    # Global context: companyId, fiscalYearId, fiscalYears
│   ├── use-api.ts                    # useApi hook (SWR-like)
│   ├── auth-provider.tsx             # SessionProvider wrapper
│   ├── normalize.ts                  # normalizeName, normalizeVatNumber, Levenshtein, findSimilarNames
│   ├── normalize-master-data.ts      # normalizePartyName, normalizeLocationName, normalizeItemName + aliases
│   ├── nepali-date.ts                # parseMiti, normalizeMiti, fyName, NEPALI_MONTHS
│   ├── money.ts                      # round2, amountsClose, toFixedStr
│   ├── format.ts                     # formatAmount (Nepali grouping), formatMiti, formatDate
│   ├── constants.ts                  # Roles, VAT, routes, pagination, batch limits, tolerances
│   ├── status-constants.ts           # All status strings, HTTP codes, toast, error messages, category keywords
│   ├── types.ts
│   └── test-utils/mock-db.ts         # mockChainReturn, mockInsertReturn for Vitest
└── db/                               # (not used — schema is in src/lib/db/)
```

---

## Architecture & Key Flows

### Auth & Authorization

- **NextAuth v5** with Credentials provider, JWT strategy.
- **SuperAdmin**: env-based (`SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD`), no DB row. Role = `"SuperAdmin"`.
- **Regular users**: DB-stored email + bcrypt password hash. Role = `"Admin"` or `"DataEntry"`. Linked to a `companyId`.
- **Per-page server guard**: Every server component page calls `getCompanyId()` (which calls `auth()` + returns `session.user.companyId`). If null → `redirect(PATH_LOGIN)`. SuperAdmin gets redirected to `/admin`.
- **API routes**: Use `requireCompanyIdFromSession(request)` — validates session, returns companyId (or a NextResponse error). For superadmins, reads `companyId` from query param and validates it exists.
- **Session shape**: `{ user: { id, email, name, companyId, role } }`.

### Database

- **Driver**: Dual — `neon-serverless` (Pool) for Neon cloud, `postgres-js` for localhost (detected via regex on `DATABASE_URL`).
- **ORM**: Drizzle ORM. Schema at `src/lib/db/schema.ts`. Migrations at `src/lib/db/migrations/`.
- **Key tables**:
  - `companies` — id, name, vatNumber, defaultVatRate
  - `fiscal_years` — id, companyId, name (e.g. "2082/83"), startYear, endYear, isActive
  - `expenses` — id, companyId, fiscalYearId, partyId, categoryId, locationId, truckId, miti (BS date), nepaliMonth, invoiceNumber, item, quantity, rate, taxableAmount, vatAmount, totalAmount, vatRate, remarks, isDeleted, rowVersion
  - `parties` — id, companyId, name, normalizedName, vatNumber, normalizedVatNumber, locationId
  - `categories` — id, companyId, name, normalizedName
  - `locations` — id, companyId, name, normalizedName
  - `trucks` — id, companyId, name, normalizedName, ownerName, truckType
  - `import_batches` — id, companyId, fiscalYearId, filename, status (pending|confirmed|cancelled), rowCount, errorCount
  - `import_batch_rows` — id, batchId, rowIndex, status (pending|valid|error|confirmed), raw* fields, resolved* fields, errors (JSON text)
  - `users` — id, companyId, email, name, passwordHash, role, isActive
  - `admin_audit_log` — id, actorEmail, action, targetType, targetId, targetName, details
- **Key constraints**:
  - `expenses_company_fy_party_invoice_uq` — unique on (companyId, fiscalYearId, partyId, invoiceNumber) WHERE invoiceNumber IS NOT NULL
  - `fiscal_years_company_name_uq` — unique on (companyId, name)
  - `parties_company_vat_uq` — unique on (companyId, normalizedVatNumber) WHERE NOT NULL
  - `users_email_uq` — unique on email
  - `users_company_email_uq` — unique on (companyId, email)

### Nepali Date Handling

- **`nepali-datetime` library** for BS date validation.
- **`parseMiti(miti)`** validates YYYY-MM-DD or DD/MM/YYYY formats → returns `{ ok, year, month, day, monthName, fiscalYearName, fiscalYear }`.
- **Fiscal year logic**: `fiscalYear = month >= 4 (Shrawan) ? year : year - 1`. FY name = `fyName(fiscalYear)` → `"2082/83"`.
- **Supported range**: BS 2000–2099.

### Fiscal Year Auto-Resolution

`resolveFiscalYear(companyId, miti)` in `src/lib/actions/expenses-helpers.ts`:
1. `parseMiti(miti)` → get `fiscalYear` number and `fiscalYearName`.
2. Look up existing FY by `companyId + name`.
3. If found → return it.
4. If not → auto-create with `isActive: false`, return it.

Used by the **single-expense creation flow** (`loadExpenseReferences` → `resolveFiscalYear`).
The **import flow** currently uses the batch-level `fiscalYearId` for all rows (auto-resolution per-row is a known gap — see PLAN.md).

### Expense Entry

Two modes:
1. **Single form** (`expense-form.tsx`): Create/edit one expense. Includes party autocomplete, VAT auto-calc, "Add Party" / "Add Location" modals.
2. **Batch entry** (`ledger-grid.tsx`): Keyboard-driven grid, reducer-managed. Rows are validated by `ledger-validation.ts`, saved via `actions/expenses.ts` `batchSaveExpenses()`.

**Duplicate detection** (on save):
- `checkInvoiceDuplicate(fingerprint)` — Level 1: exact match (same party+invoice+amounts+miti) → hard block. Level 2: same identity key (party+invoice) but different details → hard block (DB constraint would reject).
- `findSuspiciousDuplicates(fingerprint)` — Level 3: no invoice number, same party+miti+amounts → warning only.

### CSV/Excel Import Pipeline

**Upload** (`/api/import/excel`):
- User uploads .xlsx/.xls/.csv. Requires `companyId` + `fiscalYearId` from context.
- XLSX parsing with `xlsx` library. CSV uses `raw: true` to avoid date mangling (dd/mm/yyyy dates stay as-is).
- Creates `import_batches` record + `import_batch_rows` for each parsed row.

**Preview** (`/api/import/[batchId]/preview`):
- Resolves each row: party (alias → name → VAT → fuzzy match → auto-create), category (name → item inference → auto-create), location (alias → name → auto-create), miti validation, amount consistency checks.
- `autoCreate` flag gates creation of new parties/categories/locations.
- Cross-DB duplicate detection: checks existing expenses with same invoice+party in the batch's fiscal year.
- In-batch duplicate detection: same invoice+party across rows.
- Updates `import_batch_rows` with resolved IDs and errors.

**Suggestion apply** (`PATCH /api/import/[batchId]/rows/[rowId]`):
- Updates raw fields (rawPartyName, rawCategoryName, etc.) on a single row. Client re-fetches preview.

**Confirm** (`/api/import/[batchId]/confirm`):
- Inserts all valid rows as expenses in one bulk insert using `batch.fiscalYearId`.
- Updates row statuses to "confirmed", batch status to "confirmed".
- **Known gap**: All rows go into the single batch FY regardless of miti date. Per-row FY resolution + auto-creation is planned (see PLAN.md).

### Category Inference

From `status-constants.ts` and `preview/route.ts`:
- **FUEL_KEYWORDS**: `["diesel", "disel", "petrol", "fuel", "oil", "lubricant"]` — substring match on full item text.
- **FUEL_TOKEN_KEYWORDS**: `["per", "hsd", "pms"]` — exact token match (splits on non-alphanumeric).
- **SPARE_PARTS_KEYWORDS**: `["parts", "spare", "filter", "belt", "bearing"]` — substring match.
- **TYRE_KEYWORDS**: `["tyre", "tire", "tube"]` — substring match.
- Fallback: `"General"`.

### Normalization & Aliases

**`src/lib/normalize.ts`**:
- `normalizeName(v)`: trim, collapse spaces, remove `.` and `,`, uppercase.
- `normalizeVatNumber(v)`: strip non-digits.
- `levenshteinDistance(a, b)`: edit distance for fuzzy matching.
- `findSimilarNames(target, candidates, maxDistance, minLen)`: returns candidates sorted by distance.

**`src/lib/normalize-master-data.ts`**:
- `titleCase(raw)`: Title Case with lowercase prepositions.
- `normalizePartyName(raw)`: checks `PARTY_ALIASES` map (e.g. "shree duga oils" → "Shree Durga Oils", "woldlink communication ltd" → "Worldlink Communications Ltd"), falls back to titleCase.
- `normalizeItemName(raw)`: checks `ITEM_ALIASES` (e.g. "disel" → "Diesel", "pms" → "Petrol", "hsd" → "Diesel"), falls back to titleCase.
- `normalizeLocationName(raw)`: titleCase.

### Master Data CRUD Pattern

`master-page.tsx` is a reusable component used by categories, locations, trucks, fiscal-years, and parties pages. It provides:
- DataTable with search, toggle active/inactive, edit, delete.
- Slide-over form modal (create/edit).
- Uses the services layer (`src/lib/services/*.ts`) for CRUD operations.

### Reports & Exports

- **Fiscal Year Report** (`/reports/fiscal-year`): summary by category for the active FY.
- **Monthly Report** (`/reports/monthly`): breakdown by Nepali month.
- **Party Statement** (`/reports/parties` + `/reports/parties/[id]`): per-party purchase history.
- **Exports**: CSV + XLSX download via `/api/export/*` routes.

---

## API Conventions

**Response helpers** (`src/lib/api-response.ts`):
- `apiOk(data, status?)` — success JSON.
- `badRequest(detail)`, `notFound(detail)`, `conflict(detail, extra?)`, `forbidden(detail)`, `unauthorized(detail?)`, `unprocessableEntity(detail, errors[])`, `internalError(detail?)`.
- All error responses return `{ title, detail, status, errors? }`.

**Client** (`src/lib/api-client.ts`):
- `api<T>(url, options?)` — fetch wrapper that auto-serializes JSON, throws `ApiError` on non-OK responses.
- `ApiError` has `status`, `detail`, `body` fields.
- `apiUrl(path, params?)` — builds absolute URL from path + query params.

---

## Shared UI Patterns

### Modal (`src/components/ui/modal.tsx`)

- Portaled to `document.body` via `createPortal` (fixes nested `<form>` hydration errors).
- Uses `mounted` state + `useEffect` to avoid SSR `createPortal` crash.
- Entrance animation: RAF sets `visible=true` → CSS transition. Exit: `visible=false` + `closing=true` for 200ms → unmount.
- **`shown = open && visible`** — must never be `open=true && visible=false` for more than one frame.
- Module-level `openModalCount` for z-index stacking + body scroll lock (reference-counted).
- Props: `open`, `title`, `onClose`, `children`, `footer`, `position` (center/right), `width`, `closeOnOverlayClick`, `closeOnEscape`.

### SlideOver (`src/components/ui/slide-over.tsx`)
Thin wrapper — passes `position="right"` to Modal.

### ConfirmDialog (`src/components/ui/confirm-dialog.tsx`)
Destructive-action confirmation modal with configurable message, confirm/cancel labels.

### Toast (`src/components/ui/toast.tsx`)
- `useToast()` returns `{ toast(message, kind?) }`.
- Kinds: `"success"` (3s), `"error"` (6s), `"info"` (3s).
- Rendered in a fixed stack at bottom-right. Errors rendered separately to avoid overlap.

### useApi (`src/lib/use-api.ts`)
SWR-like hook for client data fetching with loading/error states.

### useApp (`src/lib/useApp.tsx`)
Global context providing: `companyId`, `fiscalYearId`, `fiscalYears`, `companies`, `activeCompany`, `activeFiscalYear`, `setActiveFiscalYear()`.
- `fiscalYearId` persisted in `localStorage` under `"vat-ledger:fiscalYearId"`.
- Falls back to active FY or first FY.

---

## Known Pitfalls

### 1. Modal Visibility State Machine
The modal uses `open` / `closing` / `visible` state. Do NOT introduce render-phase setState resets (the old `prevOpen !== open` pattern). They race the RAF and leave the modal invisible. The `closing` state is set in an effect (with inline eslint-disable) and is the correct pattern.

### 2. Modal Portal + Mounted Guard
Modal content is portaled to `document.body` to avoid nested `<form>` hydration errors. A `mounted` state + one-time `useEffect` ensures `document.body` exists before portaling. Without the guard, SSR crashes on `<Modal open>` (e.g. in `mobile-nav.tsx`). Do not remove the `mounted` guard.

### 3. Nested Forms
`<form id="party-form">` in `PartyFormFields` and `<form>` in `LocationFormModal` are inside `ExpenseForm`'s `<form>`. HTML forbids `<form>` inside `<form>`. The portal fix moves modal content out of the DOM parent, resolving this. If you add new modals that render inside a `<form>`, ensure they are portaled (all modals using `Modal` are automatically portaled).

### 4. CSV Date Mangling
XLSX library auto-detects date-like strings and converts to serial numbers. For CSV files, `raw: true` is used to preserve dates like `01/03/2083` as-is. Never remove the `raw: true` option for CSV parsing.

### 5. Import Batch Fiscal Year
All imported rows currently use `batch.fiscalYearId` (the FY selected at upload). Rows whose miti dates fall in a different FY are filed under the wrong FY. Per-row FY resolution is planned (see PLAN.md). Do not assume the batch FY is correct for all rows.

### 6. Next.js 16 Breaking Changes
This is Next.js 16.3.0 — APIs may differ from training data. Always check `node_modules/next/dist/docs/` before writing code. The `next dev` auto-managed block in this file re-adds itself.

---

## Testing Conventions

- **Framework**: Vitest. Config at `vitest.config.ts`.
- **Run**: `pnpm test` (watch), `pnpm test:run` (single run).
- **Test files**: Co-located `__tests__/*.test.ts` next to source.
- **Mock DB**: `src/lib/test-utils/mock-db.ts` provides `mockChainReturn` and `mockInsertReturn` for mocking Drizzle query chains.
- **Pattern**: `vi.mock("@/lib/db")` → mock `db.select`/`db.insert`/`db.update`/`db.delete` → use `mockChainReturn` to simulate query results.
- **Test count**: 402 tests across 25 files. All must pass before committing.

---

## Code Style

- No comments in code unless explicitly requested.
- ESLint enforced — `pnpm lint` must be clean.
- TypeScript strict — `pnpm typecheck` must be clean.
- Prefer editing existing files. Only create new files when required.
- Follow existing patterns for component structure, API routes, and service layer.

---

## Maintenance Files

### CHANGELOG.md
After completing any meaningful change (bug fix, feature, refactor), update `CHANGELOG.md`:
- Add a new entry under `## [Unreleased]` with the appropriate section (`Fixed`, `Added`, `Changed`, `Removed`).
- Use concise, user-facing descriptions.
- Reference affected files/features in parentheses when helpful.
- When a version is released, move entries from `[Unreleased]` to a dated version section.

### PLAN.md
Single tracking document for planned work, open PRs, and completed changes. Contains:
- `## Open PRs (Review)` — current PRs awaiting review/merge.
- `## TODO` — checkbox list with priority and file references. Both user and agents append tasks here. Mark `- [x]` when done.
- `## Completed` — record of finished work.

When a change is completed: mark the checkbox `- [x]` in `## TODO`, move details to `## Completed`, and add a CHANGELOG entry.
