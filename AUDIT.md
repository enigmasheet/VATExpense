# VATExpense Backend Audit — August 2026

## Security & Auth

| Sev | Finding | Location |
|---|---|---|
| **CRIT** | Default superadmin cred `changeme` + `ALLOW_DB_RESET=true` + no rate limiting → attacker can wipe the whole DB or reset any password if defaults ship | `auth.ts:25-27`, `.env.local`, `admin/reset/route.ts` |
| **CRIT** | `GET /api/companies` open to **any** authenticated user — lists every tenant's name/VAT/email/phone (POST is correctly gated) | `companies/route.ts:16-30` |
| **HIGH** | No brute-force protection anywhere on the Credentials login | `auth.ts:16-60` |
| **HIGH** | `ROLE_ADMIN` is never checked server-side — Admin and DataEntry have identical privileges (role is cosmetic, client-nav only) | `constants.ts:3`, `nav-config.ts` |
| **MED** | JWT role/company claims stale until expiry (30d); only `isActive` re-checked live | `auth.ts:65-89` |
| **MED** | Seed script plants `admin@gmail.com / admin123` if run against prod | `scripts/seed.ts:34-48` |
| **MED** | `requireCompanyId()` in server actions has no role check / no company-existence validation (footgun) | `actions/common.ts:33-38` |
| **MED** | Proxy passes deactivated-user sessions (truthy `{user:null}`), blocked only at API layer | `proxy.ts:13`, `auth.ts:86-88` |

## Expenses & Validation

| Sev | Finding | Location |
|---|---|---|
| **HIGH** | **Data-loss bug:** editing a row during an in-flight batch save is silently discarded, then stamped "saved" from stale server data | `use-ledger-save.ts:49-79`, `ledger-reducer.ts:219-233` |
| **HIGH** | Date's fiscal-year membership never verified server-side — direct API calls can file expenses in the wrong FY, corrupting reports | `expenses/route.ts:156-165`, `expenses-helpers.ts:98-113` |
| **HIGH** | Client/server amount parsing divergence (`parseFloat` vs `Number`): malformed amounts pass client validation, then fail confusingly at the server; `NaN<=0` is false | `ledger-validation.ts:101`, `ledger-reducer.ts:98` |
| **MED** | Duplicate detection is case/whitespace-sensitive — `INV-001` and `inv-001` both save | `ledger-utils.ts:22-24`, `schema.ts:194-196` |
| **MED** | Ledger grid ignores the company's configured VAT rate (always 13%) while the single-entry form uses it — inconsistent `vatRate` for non-13% companies | `use-ledger-save.ts:26`, `expense-form.tsx:334` |
| **MED** | `optionalNumeric` accepts negatives — `quantity:-5`, `vatRate:"-5.00"` persist | `validation/expense.ts:7-9` |
| **MED** | Zero-value expenses saveable via API (no server positivity check) | `expense.ts:17` |
| **MED** | No VAT-number format validation — garbage normalizes to null or collides | `masters.ts`, `normalize.ts` |
| **MED** | Concurrent saves → whole-batch fails with generic `ERR_UNEXPECTED` instead of a duplicate message | `actions/expenses.ts:228-242` |

## API / Services

| Sev | Finding | Location |
|---|---|---|
| **HIGH** | **Cross-tenant FK references:** expense POST never validates `categoryId`/`locationId`/`truckId` ownership; PATCH copies all FKs with no ownership check | `expenses/route.ts:218-241`, `expenses/[id]/route.ts:109-113` |
| **HIGH** | **Hard-delete masters → generic 500:** deleting a party/category/fiscal-year referenced by expenses throws FK violation | `services/parties.ts:139-150`, `categories.ts:72-83` |
| **MED** | Expense create + FY auto-create not transactional → orphaned FY on failure | `expenses-helpers.ts:35-44` |
| **MED** | Check-then-insert races → 500 instead of 409 (unique-index violation) | all create paths |
| **MED** | `invoice-keys` unbounded payload; null-filter applied in JS after full fetch | `invoice-keys/route.ts:21-38` |
| **MED** | PATCH can write `fiscalYearId:null` into a NOT NULL column → 500 | `expenses/[id]/route.ts:110-112` |
| **LOW** | Unvalidated UUID query params → 500; swallowed errors with no logging; 400 vs 422 inconsistency | `expenses/route.ts:54-57`, several routes |

## Admin / Import / Export / Reports

| Sev | Finding | Location |
|---|---|---|
| **HIGH** | **CSV formula injection** on all 4 export endpoints — `=cmd|...`, `=HYPERLINK(...)` in party/item/remarks execute in Excel | `export/fiscal-year/route.ts:235`, `monthly:107`, `parties:95`, `parties/[id]:103` |
| **HIGH** | **Import file-size limit unenforced** (`MAX_IMPORT_FILE_SIZE` unused; `maxBodySize` is invalid/dead Next config) + **`xlsx@0.18.5` has known unpatched CVEs** (CVE-2023-30533, CVE-2024-22363) + full sheet materialized before the 200-row cap → memory DoS | `excel/route.ts:18,135-153`, `package.json:35` |
| **HIGH** | **Cross-company leak via `/api/reports/parties/[id]`** — unscoped party/FY lookups + returns 200 even when rows empty → another company's party name/VAT enumerable | `party-statement.ts:75-87`, `reports/parties/[id]/route.ts:22-23` |
| **HIGH** | **Preview/confirm TOCTOU:** double-confirm duplicates invoice-less rows (unique index only covers non-null invoice); confirm trusts stale preview state without re-validation | `confirm/route.ts:37-83` |
| **MED** | `GET preview?autoCreate=true` **mutates the DB** (inserts parties/categories) — orphaned data on abandoned batches | `preview/route.ts:98-195` |
| **MED** | Imported `miti` stored **raw/un-normalized** (`15/08/2082`) breaking date ordering | `preview/route.ts:308`, `confirm/route.ts:70` |
| **MED** | Password reset doesn't invalidate existing JWTs (no `passwordChangedAt`) | `reset-password/route.ts:41` |
| **MED** | Audit log not DB-enforced immutable; reset is unlogged; `create_company` writes no audit entry | `schema.ts:303-316`, `admin/reset` |
| **MED** | Admin FY activation non-transactional (service layer is); ambiguous `includes` header matching in import | `companies/[id]/fiscal-years/route.ts:77-90`, `excel/route.ts:50-57` |
| **MED** | Reports order months Baisakh-first (calendar) while comments claim Shrawan-first FY order | `server-data/reports.ts:66-68` |

## Remediation Plan

### Phase 1 — Security (CRITICAL + HIGH)
- 1.1 Gate `GET /api/companies` behind `ROLE_SUPER_ADMIN`
- 1.2 Scope party/FY lookups in `party-statement.ts` to `companyId`
- 1.3 Enforce import file-size + row cap before `sheet_to_json`; upgrade SheetJS or add size guard
- 1.4 Sanitize CSV exports for formula injection (`= + - @` prefix stripping)
- 1.5 Validate `categoryId`/`locationId`/`truckId` ownership on expense POST/PATCH

### Phase 2 — Data Integrity (HIGH + MED)
- 2.1 Server-side fiscal-year membership check for `miti` on expense create/update
- 2.2 Make import confirm atomic (`UPDATE ... WHERE status='pending'`) + re-validate
- 2.3 Normalize `miti` before storage in import confirm
- 2.4 Fix hard-delete master FK violations → 409 with dependency message
- 2.5 Wrap expense-create + FY auto-create in a transaction
- 2.6 Server-side positivity/format validation for amounts (reject 0/negative, cap magnitude)
