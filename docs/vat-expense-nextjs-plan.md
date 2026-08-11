# VAT Expense Ledger — Next.js Fullstack Plan (v2.0)

Self-contained plan for the Next.js + Neon implementation. Supersedes the
earlier .NET/separate-backend version — this is the one to build against.

Status markers below reflect what's actually in the repo right now
(`/home/claude/vat-expense-app`), not just what's planned, so this doc
stays a true map of the build.

```text
✅ done   🔶 in progress / partial   ⬜ not started
```

---

## 1. System objective

A single Next.js application (frontend + backend in one deployable) that
replaces the current Excel-based VAT expense workflow: store purchase
invoices, organize by Nepali fiscal year/month, maintain normalized
supplier data, catch duplicates, validate amounts, and produce monthly /
fiscal-year reports with Excel import and export.

Same scope as before — this plan changes *how* it's built, not *what* it
does. Included/excluded modules are unchanged from the original core plan
(expenses, parties, categories, locations, fiscal years, reports, Excel
import/export; no sales, inventory, payroll, ledger, banking, or AI/OCR).

---

## 2. Architecture

One Next.js app, no separate API tier:

```text
                         Browser
                            │
                            ▼
              ┌──────────────────────────┐
              │         Next.js 16          │
              │        (App Router)          │
              ├──────────────────────────┤
              │  app/*            → pages    │
              │  app/api/*/route.ts → API    │
              │  lib/validation     → Zod    │
              │  lib/db/schema.ts   → Drizzle │
              └───────────┬──────────────┘
                          │ drizzle-orm (neon-http driver)
                          ▼
              ┌──────────────────────────┐
              │   Neon (serverless Postgres) │
              └──────────────────────────┘
```

**Why fullstack Next.js instead of a separate API:** one deploy target,
one language end to end, and Neon's HTTP driver is built for exactly this
— serverless functions that open a connection per request without a
connection-pool problem. The tradeoff (noted in §14) is that this couples
the app to whatever host runs Next.js API routes well — Vercel is the
default fit.

### 2.1 Confirmed tech stack (as installed)

```text
Framework      Next.js 16, App Router, TypeScript, Turbopack
Styling        Tailwind CSS v4
Database       Neon (serverless Postgres)
ORM            Drizzle ORM + @neondatabase/serverless (neon-http driver)
Validation     Zod
Nepali dates   nepali-datetime (BS 2000–2099 supported, verified below)
Dev tooling    drizzle-kit (migrations/studio), tsx (run TS scripts), dotenv
```

`package.json` scripts:
```text
dev            next dev
build          next build
start          next start
lint           eslint
db:generate    drizzle-kit generate     (writes SQL migration files)
db:push        drizzle-kit push         (applies schema directly — dev only)
db:studio      drizzle-kit studio       (browse the DB)
db:seed        node --env-file=.env.local --import tsx scripts/seed.ts
```

---

## 3. Data model ✅

Implemented in `lib/db/schema.ts`. Six tables, all company-scoped.

```text
companies
----------------
id (uuid, pk)
name
vatNumber
address, phone, email
defaultVatRate      numeric(5,2), default 13.00
createdAt, updatedAt

fiscalYears
----------------
id (uuid, pk)
companyId (fk)
name                "2082/83"
startYear, endYear  BS years
isActive
UNIQUE (companyId, name)

locations
----------------
id (uuid, pk)
companyId (fk)
name, normalizedName
isActive
UNIQUE (companyId, normalizedName)

categories
----------------
id (uuid, pk)
companyId (fk)
name, normalizedName
isActive
UNIQUE (companyId, normalizedName)

parties
----------------
id (uuid, pk)
companyId (fk)
name, normalizedName
vatNumber            nullable
normalizedVatNumber  nullable
locationId (fk, nullable)
isActive
PARTIAL UNIQUE (companyId, normalizedVatNumber) WHERE normalizedVatNumber IS NOT NULL

expenses
----------------
id (uuid, pk)
companyId, fiscalYearId, partyId, categoryId, locationId (fks)
miti                 text "YYYY-MM-DD" (Bikram Sambat)
nepaliMonth          derived, e.g. "Chaitra"
invoiceNumber        nullable (some cash memos have none)
item
quantity             numeric(18,3), nullable
rate                 numeric(18,4), nullable
taxableAmount        numeric(18,2)
vatAmount            numeric(18,2)
totalAmount          numeric(18,2)
vatRate              numeric(5,2)
remarks
isDeleted, deletedAt          -- soft delete
createdBy, updatedBy
rowVersion           int, default 1  -- optimistic concurrency
createdAt, updatedAt
PARTIAL UNIQUE (companyId, fiscalYearId, partyId, invoiceNumber) WHERE invoiceNumber IS NOT NULL
INDEX on miti, fiscalYearId, partyId
```

Design decisions carried over from the original plan and now enforced in
code:
- **All money fields are `numeric`, never `float`** — avoids floating-point
  drift breaking duplicate/tolerance checks.
- **Party VAT number is nullable** — small vendors often have none; the
  unique constraint is a *partial* index so it only applies when present.
- **Invoice number is nullable and not globally unique** — identity is
  `Company + FiscalYear + Party + InvoiceNumber`, and that too is a partial
  index (null-invoice rows fall back to fuzzy Level-3 duplicate matching
  in application code, never a hard DB block).
- **Expense deletes are soft** (`isDeleted`/`deletedAt`) — financial rows
  stay recoverable.
- **`rowVersion`** gives optimistic concurrency on updates — two people
  editing the same expense get a conflict, not a silent overwrite.

---

## 4. Nepali date subsystem ✅

`lib/nepali-date.ts` wraps the `nepali-datetime` package rather than
implementing BS↔AD conversion from scratch — BS month lengths are
irregular (29–32 days) and aren't derivable from a formula, they require a
maintained lookup table, which is exactly what that package ships.

**Verified by direct testing against the installed package** (not assumed):
- Supported range: **BS 2000–2099** (~AD 1943–2043) — comfortably covers
  the current fiscal year (2082/83) with ~17 years of runway.
- Day-length validation is real, not naive: e.g. `2083-03-32` (Ashadh 32,
  2083) is accepted because that year's Ashadh genuinely has 32 days,
  while `2083-03-33` and `2082-01-32` correctly fail — confirmed by
  testing multiple boundary dates against the library.

`parseMiti(miti: string)` validates the string, round-trips it against the
parsed components (defense in depth against silent clamping), and derives:
- `monthName` (Baisakh…Chaitra)
- `fiscalYearName` (fiscal year runs Shrawan → Ashadh; a date in Baisakh–Ashadh
  belongs to the fiscal year that *started* the previous BS year)

`fromEnglishDate` / `toEnglishDate` round out AD↔BS conversion for things
like defaulting "today" in the seed script.

**Maintenance note:** if the covered range runs out (~2043 AD) or the
package goes unmaintained, only this one file needs to change — the rest
of the app calls `parseMiti`, not the library directly.

---

## 5. Normalization ✅

`lib/normalize.ts`:
- `normalizeName` — trim, collapse whitespace, strip `.`/`,`, uppercase.
- `normalizeVatNumber` — digits only, or `null` if empty.

Applied consistently before any duplicate check on Party/Category/Location.

---

## 6. Duplicate detection ✅ (in `app/api/expenses/route.ts`)

Same three tiers as the original plan, now with concrete implementation:

**Level 1 — Exact duplicate.** Same Company + FiscalYear + Party +
InvoiceNumber already exists, and Miti + Taxable + VAT + Total all match
→ `409 Conflict`, `duplicateLevel: "exact"`.

**Level 2 — Invoice duplicate.** Same identity key exists but amounts or
date differ → `409 Conflict`, `duplicateLevel: "invoice"`. Still blocks
the naive insert (the DB constraint would reject it anyway) but the
response is worded as "review this" rather than "this already happened."

**Level 3 — Suspicious duplicate.** Only checked when `invoiceNumber` is
absent: same Party + Miti + Taxable + VAT + Total → returned as a
`warnings[]` string alongside a successful `201`, never blocking. Prevents
false positives from two unrelated round-number invoices.

---

## 7. Amount validation ✅ (`lib/validation/expense.ts`)

Tolerance is explicit, not vague:

```text
tolerance = max(NPR 1.00, 0.5% of taxable amount)
```

Checks `Quantity × Rate ≈ Taxable`, `Taxable × VatRate ≈ VAT`,
`Taxable + VAT ≈ Total` — each outside tolerance produces a warning
string, never a blocked save. The invoice's stated values are always
authoritative over the calculated ones.

---

## 8. API routes ✅ core CRUD, ✅ Server Actions, ⬜ import/export

```text
✅ GET        /api/companies
✅ GET        /api/fiscal-years?companyId=
✅ GET        /api/locations?companyId=
✅ GET        /api/categories?companyId=
✅ GET        /api/parties?companyId=
✅ GET        /api/expenses?companyId=&fiscalYearId=&page=&pageSize=
✅ GET/PATCH/DELETE  /api/expenses/{id}

✅ Server Actions (lib/actions/expenses.ts):
   createExpense    — single expense creation
   batchSaveExpenses — batch save (up to 200 rows, single transaction)
   deleteExpense    — soft delete
   updateExpense    — update with optimistic concurrency

✅ Server Actions (lib/actions/masters.ts):
   createParty / updateParty / deleteParty
   createCategory / updateCategory / deleteCategory
   createLocation / updateLocation / deleteLocation
   createFiscalYear / updateFiscalYear / deleteFiscalYear

✅ Server Data (lib/server-data.ts):
   getCompanyId, getCompany, getFiscalYears, getActiveFiscalYear
   getParties, getCategories, getLocations
   getDashboardSummary (SQL aggregation)
   getExpenses (paginated), getExpenseById
   getMonthlyReport, getFiscalYearReport

⬜ POST   /api/import/excel          (upload + parse)
⬜ GET    /api/import/{batchId}/preview
⬜ POST   /api/import/{batchId}/confirm
⬜ GET    /api/export/monthly
⬜ GET    /api/export/fiscal-year
```

**Server Actions replace Route Handlers for all mutations.** The API routes
above are retained for read-only queries used by client components that
still need client-side fetching (e.g., existing invoice keys for duplicate
detection in the ledger grid).

**Standard error envelope** (`lib/api-response.ts`, loosely RFC 7807):
```json
{ "title": "Conflict", "detail": "...", "status": 409, "existing": { ... } }
```
Validation errors (422) include a per-field `errors[]` array from the Zod
issue list. The frontend handles one shape everywhere instead of parsing a
different response per endpoint.

**Pagination** ✅ on `GET /api/expenses` — `page`/`pageSize` query params,
response is `{ data, page, pageSize, total }`. Default page size 50, capped
at 200.

**Optimistic concurrency** ✅ on `PATCH /api/expenses/{id}` — caller must
send back the `rowVersion` it read; a mismatch (or a lost update race) is
a `409` with the current version, not a silent overwrite.

**Soft delete** ✅ on `DELETE /api/expenses/{id}` — sets `isDeleted`, never
removes the row.

---

## 9. Frontend pages

```text
✅ /                 dashboard — Server Component, SQL aggregation for totals
✅ /expenses          list — Server Component + client-side filtering/pagination
✅ /expenses/new       batch entry — Server Component loads parties/categories,
                        client grid with batch save via Server Action
✅ /expenses/[id]      edit — Server Component + ExpenseForm client component
✅ /parties            list + add — MasterPage client component
✅ /categories         list + add — MasterPage client component
✅ /locations          list + add — MasterPage client component
✅ /fiscal-years       list + create — MasterPage client component
✅ /reports/monthly    — Server Component + client export button
✅ /reports/fiscal-year — Server Component + client export button
⬜ /import
```

### Architecture notes

```text
Server Components (fetch data on server):
  /                     → getDashboardSummary (SQL aggregation)
  /expenses             → getExpenses (paginated query)
  /expenses/new         → getParties + getCategories (preloaded)
  /expenses/[id]        → getExpenseById
  /reports/monthly      → getMonthlyReport (SQL aggregation)
  /reports/fiscal-year  → getFiscalYearReport (SQL aggregation)

Client Components (interactive only):
  DashboardClient       — shortcuts, recent table
  ExpensesListClient    — filters, pagination, delete
  BatchEntry → LedgerGrid — multi-row entry, batch save
  ExpenseForm           — single expense create/edit
  MasterPage            — CRUD for parties/categories/locations/fiscal-years
  MonthlyReportExport   — opens export URL
  FiscalYearReportExport — opens export URL
```

### 9.1 Design direction ✅ (tokens implemented in `app/globals.css`)

Treated as a working ledger, not a marketing page — restraint over flair,
per the brief's actual job (fast, accurate data entry).

```text
Background     #faf9f5  soft paper
Surface        #ffffff
Foreground     #1c2621  deep ink-green
Muted          #5b6b63
Border         #dcded4
Primary        #0f5c4e  deep teal ink (buttons, links, active nav)
Warning        #b45309 on #fef3e2   (Level 2/3 duplicate + tolerance flags)
Danger         #b91c1c on #fdecec  (Level 1 exact-duplicate blocks only)
```

Typography: Geist Sans (body/UI), Spectral serif (headings — the one
"signature" element, giving the ledger a slight book-of-record feel),
Geist Mono for amounts via a `.tabular-amount` utility class so rupee
columns align the way they do in the source Excel sheets.

`lib/format.ts` ✅ formats amounts with **Nepali digit grouping**
(`Rs. 8,55,706.00`, not `855,706.00`) — matters for anyone visually
cross-checking against the old spreadsheets.

---

## 10. Reusable UI primitives ✅ (`components/ui/`)

```text
button.tsx    primary / secondary / ghost variants
field.tsx     Field wrapper + styled Input/Select
badge.tsx     default / warning / danger / success tones
             (maps directly to duplicate-detection levels)
```

---

## 11. Excel import/export ⬜

Not yet built. Plan, unchanged in spirit from the original design, adapted
for Next.js:

```text
POST /api/import/excel
  → multipart/form-data upload, parsed via a route handler reading
    req.formData()
  → parse workbook with a library (SheetJS/xlsx — pure JS, no native
    deps, safe in a serverless function)
  → map columns → normalize → validate rows → resolve/create masters
  → run duplicate detection per row (reusing the same logic as
    POST /api/expenses, factored into a shared function)
  → write an ImportBatch record + archive the original file
    (Vercel Blob or Neon large-object/base64 column — file storage
    choice still open, see §14)
  → return a preview payload with per-row status

POST /api/import/{batchId}/confirm
  → runs the actual inserts inside a single DB transaction
    (drizzle's db.transaction) — all-or-nothing, matching the
    original plan's rollback-safety requirement
```

Export (`GET /api/export/monthly`, `/api/export/fiscal-year`) generates an
`.xlsx` with SheetJS and returns it as a `Response` with
`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

## 12. Reports ⬜

Monthly and fiscal-year reports are plain aggregation queries — no stored
totals, computed on read:

```sql
-- shape, not literal SQL — Drizzle query builder equivalent
SELECT categoryId, SUM(taxableAmount), SUM(vatAmount), SUM(totalAmount)
FROM expenses
WHERE companyId = ? AND fiscalYearId = ? AND nepaliMonth = ? AND isDeleted = false
GROUP BY categoryId
```

Fiscal-year report is the same shape grouped by `nepaliMonth` instead of
`categoryId`, across all 12 months Shrawan→Ashadh.

---

## 13. Auth & access ⬜

Not yet built. Plan:

```text
Library      Auth.js (NextAuth v5) — fits Next.js App Router natively
Strategy     Credentials provider, session-based (JWT or DB session)
Passwords    bcrypt hashed, never stored plain
Roles        Admin      full CRUD, masters, import/export
             DataEntry  create/edit own expenses, no delete, no masters
Scoping      Every query filters by session.user.companyId — a user from
             Company A must never reach Company B's rows by editing an
             ID in a URL, regardless of role
```

Kept intentionally minimal — two roles, not a permission matrix — per the
original plan's "don't overbuild V1 security" principle.

---

## 14. Environment, secrets & deployment

**Environment variables** ✅ pattern established — `DATABASE_URL` is read
from `process.env` only, `.env.example` ships with a placeholder, `.env*`
is git-ignored by the Next.js scaffold default. No connection string has
ever been written into a committed file.

> **Standing reminder:** if a database password is ever pasted into a
> chat, doc, or ticket, treat it as compromised and rotate it in the Neon
> console before use — regardless of whether it's actually been used yet.

**Deployment target:** Vercel is the natural fit — same company as
Next.js, first-class support for the App Router, and Neon has an official
Vercel integration that manages `DATABASE_URL` automatically per
environment (production/preview/dev branches can each get their own Neon
branch DB, which is a nice fit for testing Excel-import changes against a
throwaway copy of real data).

**Open question to decide before Phase 5 (import):** where do archived
uploaded Excel files live? Options: Vercel Blob (simplest, same
ecosystem), S3-compatible bucket, or skip file retention for V1 and only
keep the parsed row data. Recommend deferring this decision until
import is actually being built rather than blocking on it now.

---

## 15. Testing strategy ⬜

Not yet set up. Plan:

```text
Unit (Vitest)
  lib/nepali-date.ts    valid Miti → correct month/FY; invalid day/month
                         rejected; out-of-range year rejected
  lib/normalize.ts       casing/whitespace/punctuation → same key
  lib/validation/*        tolerance boundary cases (exactly at, just
                         outside, the max(1, 0.5%) threshold)

Integration (Vitest + a Neon branch DB, or local Postgres via Docker)
  duplicate detection     Level 1/2/3 scenarios from §6, including the
                         null-invoice-number fallback path
  concurrency              two PATCHes racing on the same rowVersion
  soft delete               deleted rows excluded from listings/reports

E2E (Playwright, later)
  add-expense happy path, duplicate-blocked path, Excel import preview
```

---

## 16. Implementation phases — status

```text
Phase 1  Foundation                                    ✅ done
  Next.js scaffold, Tailwind, Drizzle schema, Neon client,
  Nepali date service, seed script

Phase 2  Master data APIs                               ✅ done
  Party/Category/Location routes, normalization,
  duplicate validation, DB constraints

Phase 3  Expense API                                     ✅ done
  Create/list/update/soft-delete, duplicate detection,
  amount tolerance, pagination, concurrency

Phase 3b Frontend pages                                  ✅ done
  Dashboard (Server Component + SQL aggregation),
  expenses list (Server + Client hybrid),
  batch entry (Server Action batch save),
  expenses edit, parties/categories/locations/fiscal-years pages

Phase 3c Server Actions & Server Components              ✅ done
  batchSaveExpenses — single transaction for up to 200 rows
  createExpense, deleteExpense, updateExpense
  All master CRUD actions (party/category/location/fiscalYear)
  Dashboard uses SQL aggregation (no row fetching)
  Reports use SQL aggregation (monthly + fiscal year)
  Party search optimized: load once, search locally in browser

Phase 4  Reports                                          ✅ done
  Monthly + fiscal-year aggregation, category breakdown
  Server Components with SQL aggregation

Phase 5  Excel import/export                              ⬜ not started
  Upload, parse, preview, transactional confirm, export

Phase 6  Auth & RBAC                                       ✅ partially done
  Auth.js configured, credentials provider working
  Admin/DataEntry roles in schema
  Company-scoped queries enforced in all actions

Phase 7  Data migration                                     ⬜ not started
  Run real historical Excel files through the Phase-5 pipeline
  as the first production test — should surface the known
  duplicate (invoice 4630) and known invalid date (32/03/2082)
```

---

## 17. Repository structure (current, real)

```text
vat-expense-app/
├── app/
│   ├── api/
│   │   ├── companies/route.ts
│   │   ├── fiscal-years/route.ts
│   │   ├── locations/route.ts
│   │   ├── categories/route.ts
│   │   ├── parties/route.ts
│   │   ├── parties/by-vat/route.ts
│   │   └── expenses/
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   │   └── import/ ...
│   │   └── export/ ...
│   │   └── reports/ ...
│   ├── expenses/
│   │   ├── page.tsx              ✅ Server Component + ExpensesListClient
│   │   ├── new/page.tsx          ✅ Server Component (loads parties/categories)
│   │   └── [id]/page.tsx         ✅ Server Component + ExpenseDetailClient
│   ├── reports/
│   │   ├── monthly/page.tsx      ✅ Server Component
│   │   └── fiscal-year/page.tsx  ✅ Server Component
│   ├── parties/page.tsx          ✅ MasterPage client component
│   ├── categories/page.tsx       ✅ MasterPage client component
│   ├── locations/page.tsx        ✅ MasterPage client component
│   ├── fiscal-years/page.tsx     ✅ MasterPage client component
│   ├── import/page.tsx           ✅ Client component
│   ├── login/page.tsx            ✅ Client component
│   ├── layout.tsx                ✅ nav shell, fonts, design tokens
│   ├── page.tsx                  ✅ Server Component + DashboardClient
│   └── globals.css               ✅ design tokens
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── field.tsx
│   │   ├── badge.tsx
│   │   └── confirm-dialog.tsx
│   ├── expenses/
│   │   ├── batch-entry.tsx       ✅ Client (wraps LedgerGrid)
│   │   ├── ledger-grid.tsx       ✅ Client (batch save via Server Action)
│   │   └── expense-form.tsx      ✅ Client (single expense form)
│   ├── dashboard-client.tsx      ✅ Client (dashboard interactive parts)
│   ├── expenses-list-client.tsx  ✅ Client (filters, pagination, delete)
│   ├── expense-detail-client.tsx ✅ Client (wraps ExpenseForm)
│   ├── monthly-report-export.tsx ✅ Client (export button)
│   ├── fiscal-year-report-export.tsx ✅ Client (export button)
│   ├── master-page.tsx           ✅ Client (reusable CRUD component)
│   └── app-shell.tsx             ✅ Client (layout shell)
├── lib/
│   ├── db/
│   │   ├── schema.ts             ✅
│   │   └── index.ts              ✅ Neon client
│   ├── actions/
│   │   ├── expenses.ts           ✅ Server Actions (batch save, CRUD)
│   │   └── masters.ts            ✅ Server Actions (party/category/location/fy)
│   ├── server-data.ts            ✅ Server-side data fetching functions
│   ├── validation/
│   │   ├── expense.ts            ✅
│   │   ├── masters.ts            ✅
│   │   └── utils.ts              ✅
│   ├── expenses/
│   │   └── duplicates.ts         ✅
│   ├── nepali-date.ts            ✅
│   ├── normalize.ts              ✅
│   ├── format.ts                 ✅
│   ├── money.ts                  ✅
│   ├── constants.ts              ✅
│   ├── api-response.ts           ✅
│   ├── api-client.ts             ✅ (used by client components)
│   ├── use-app.tsx               ✅ (client context for FY/company)
│   └── auth-provider.tsx         ✅
├── scripts/
│   └── seed.ts                    ✅
├── drizzle.config.ts              ✅
├── .env.example                   ✅ (placeholder only, never real creds)
└── package.json                   ✅ db:generate/push/studio/seed scripts
```

---

## 18. Key design decisions (unchanged principles, now implemented)

```text
1.  Expense is the core business entity; Party/Category/Location are
    normalized masters, never duplicated onto the expense row.
2.  Nepali Miti and fiscal year are first-class, backed by a maintained
    lookup table (via nepali-datetime), not a derived formula.
3.  Invoice number is not globally unique, and not always present —
    identity and its uniqueness constraint are both partial/conditional.
4.  Duplicate detection is tiered: hard-block on exact/invoice-level
    matches, warning-only on fuzzy fingerprint matches.
5.  All money fields are numeric/decimal, never float.
6.  Deletes are soft; updates carry optimistic concurrency.
7.  Reports are always computed from expense rows, never stored totals.
8.  One Next.js deployable, Neon HTTP driver — no separate API tier,
    no persistent connection pool to manage.
9.  Secrets live only in environment variables; nothing generated by
    this project ever contains a real credential.
10. Server Components by default; Client Components only for interactive UI.
11. Server Actions for all mutations (create/update/delete).
12. Batch invoice save: one Server Action call for up to 200 rows,
    single database transaction, not row-by-row API calls.
13. Party/Category/Location master data loaded once per page,
    searched locally in the browser — no per-keystroke DB queries.
14. Dashboard and reports use SQL aggregation (SUM/COUNT/GROUP BY),
    not fetching all rows into JavaScript.
15. Database constraints enforce uniqueness; application code provides
    user-friendly messages on top of the DB errors.
```
