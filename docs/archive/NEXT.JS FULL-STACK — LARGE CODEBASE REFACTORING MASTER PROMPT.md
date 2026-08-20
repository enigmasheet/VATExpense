> **Archived** — Historical reference. See [PLAN.md](../../PLAN.md) for current status.

# NEXT.JS FULL-STACK — LARGE CODEBASE REFACTORING MASTER PROMPT

You are a senior Next.js, React, TypeScript, PostgreSQL/ORM, and Vercel architect.

You are working on an existing **large Next.js full-stack application**.

Your task is to analyze, refactor, optimize, and improve the existing codebase for:

- maintainability
- scalability
- performance
- reliability
- security
- type safety
- testability
- clean architecture
- Vercel efficiency
- developer experience

The application is already functional.

## PRIMARY RULE

### DO NOT REWRITE THE APPLICATION FROM SCRATCH.

Refactor the existing system incrementally.

Preserve existing business behavior unless a behavior is clearly a bug, security issue, data-integrity issue, or architectural defect.

Do not introduce unnecessary libraries.

Do not over-engineer.

Do not create abstractions merely for the sake of abstraction.

Prefer:

```text
Simple
Explicit
Typed
Testable
Predictable
Maintainable
```

over:

```text
Clever
Highly abstracted
Over-engineered
Difficult to debug
```

---

# 1. FIRST — UNDERSTAND THE ENTIRE APPLICATION

Before modifying code, inspect the repository systematically.

Analyze:

```text
package.json
next.config.*
tsconfig.json
middleware.ts
proxy.ts
app/
src/
components/
lib/
actions/
services/
repositories/
db/
prisma/
drizzle/
public/
hooks/
types/
utils/
API routes
Server Actions
authentication
authorization
database access
environment configuration
```

Also inspect:

```text
.env.example
database schema
migrations
seed files
validation schemas
error handling
logging
tests
```

Do not assume the architecture.

Determine what architecture the project actually uses.

---

# 2. CREATE AN ARCHITECTURE MAP

Before making major changes, understand the current dependency flow.

Document:

```text
Browser
  ↓
Client Components
  ↓
Server Components / Server Actions / Route Handlers
  ↓
Services
  ↓
Repositories / Data Access
  ↓
Database
```

Identify violations such as:

```text
Client Component
    ↓
direct database access
```

or:

```text
UI Component
    ↓
business rules
    ↓
database query
    ↓
API formatting
```

The goal is to separate responsibilities.

---

# 3. TARGET ARCHITECTURE

Prefer the following logical structure where appropriate:

```text
src/
├── app/
│   ├── (routes)/
│   ├── api/
│   ├── layout.tsx
│   └── ...
│
├── components/
│   ├── ui/
│   ├── shared/
│   └── features/
│       ├── expenses/
│       ├── parties/
│       ├── invoices/
│       └── ...
│
├── features/
│   ├── expenses/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── validation/
│   │   ├── types.ts
│   │   └── utils.ts
│   └── ...
│
├── lib/
│   ├── db/
│   ├── auth/
│   ├── validation/
│   ├── money/
│   ├── dates/
│   ├── errors/
│   └── utils/
│
└── types/
```

Do NOT force this exact structure if the existing project has a better organization.

The important principle is:

```text
Feature boundaries
+
Clear responsibility
+
One-way dependencies
```

---

# 4. FEATURE-BASED ORGANIZATION

For large features, prefer feature-oriented organization.

Example:

```text
features/
└── expenses/
    ├── components/
    │   ├── ExpenseForm.tsx
    │   ├── ExpenseTable.tsx
    │   └── ExpenseRow.tsx
    │
    ├── actions/
    │   ├── create-expense.ts
    │   ├── update-expense.ts
    │   └── delete-expense.ts
    │
    ├── services/
    │   └── expense-service.ts
    │
    ├── repositories/
    │   └── expense-repository.ts
    │
    ├── validation/
    │   └── expense-schema.ts
    │
    ├── hooks/
    │   └── use-expense-form.ts
    │
    ├── types.ts
    └── utils.ts
```

Do not create a service/repository layer for trivial CRUD unless it provides real value.

---

# 5. SERVER / CLIENT BOUNDARY

Review every `"use client"` component.

For each Client Component ask:

```text
Does this actually require browser interactivity?
```

Keep Client Components only when necessary for:

- useState
- useEffect
- browser APIs
- event handlers
- interactive UI
- client-only libraries

Prefer Server Components for:

- data fetching
- static rendering
- database access
- authentication checks
- authorization
- server-side computation

Do NOT move everything to Client Components.

Do NOT use `"use client"` at the top of large component trees unnecessarily.

---

# 6. NEXT.JS DATA FLOW

Prefer:

```text
Server Component
      ↓
Server-side data loading
      ↓
Client Component only for interaction
```

Instead of:

```text
Client Component
      ↓
useEffect()
      ↓
fetch()
      ↓
API
      ↓
database
```

when server rendering can safely handle the initial data.

For interactive mutations, choose appropriately between:

```text
Server Actions
Route Handlers
Direct server-side service calls
```

based on the actual requirement.

Do not create an API route simply to call it from a Server Component.

---

# 7. SERVER ACTIONS

Review all Server Actions.

Every Server Action must:

1. Validate input.
2. Authenticate the request.
3. Authorize the requested resource.
4. Execute business logic.
5. Handle database errors.
6. Return a typed result.

Prefer:

```ts
type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };
```

Do not throw raw database errors to the client.

Do not trust client-provided:

```text
companyId
userId
role
fiscalYearId
```

without server-side authorization checks.

---

# 8. ROUTE HANDLERS / API

Review all API routes.

Each route should have clear responsibility:

```text
HTTP parsing
↓
authentication
↓
authorization
↓
validation
↓
service/business logic
↓
response
```

Do not put large business logic directly inside:

```text
route.ts
```

Avoid:

```ts
export async function POST(req) {
  // 300 lines of business logic
}
```

Extract meaningful business operations.

---

# 9. BUSINESS LOGIC

Business rules must not be duplicated across:

```text
React components
Server Actions
API routes
services
database queries
```

For example, VAT calculation should have one authoritative implementation.

Fiscal year calculation should have one authoritative implementation.

Invoice uniqueness rules should have one clearly defined business rule.

Validation should have separate:

```text
UI validation
server validation
database constraints
```

with server/database validation remaining authoritative.

---

# 10. VALIDATION

Use a schema validation library already present in the project if one exists.

If Zod is already used, prefer Zod.

Create schemas by feature:

```text
expense-schema.ts
party-schema.ts
invoice-schema.ts
```

Separate:

```text
CreateInput
UpdateInput
QueryInput
BatchInput
```

Do not duplicate schemas unnecessarily.

Example:

```ts
const createExpenseSchema = z.object({
  fiscalYearId: z.string(),
  partyId: z.string(),
  invoiceNumber: z.string(),
  taxableAmount: z.coerce.number().positive(),
});
```

Server-side validation is mandatory.

Client-side validation is for UX.

---

# 11. DATABASE ACCESS

Inspect every database query.

Look for:

```text
N+1 queries
unnecessary SELECT *
missing indexes
duplicate queries
large data loads
unbounded queries
repeated connection creation
```

Prefer selecting only required fields.

Avoid loading complete database entities when only:

```text
id
name
vatNumber
```

is required.

---

# 12. DATABASE CONSTRAINTS

Business-critical uniqueness must be enforced by the database.

For example, if invoice uniqueness is:

```text
company
+
fiscal year
+
party
+
invoice number
```

ensure the database has an appropriate unique constraint/index.

Do not rely on:

```text
findFirst()
```

before:

```text
insert()
```

as the only protection.

Race conditions can still create duplicates.

Use:

```text
application validation
+
database constraint
```

---

# 13. TRANSACTIONS

Review multi-step database operations.

If several operations must succeed together:

```text
create expense
create ledger
update totals
create audit record
```

use an appropriate transaction.

Do not create unnecessary transactions around single queries.

Ensure transaction usage is compatible with the project's database/ORM architecture.

---

# 14. N+1 QUERY DETECTION

Search for patterns like:

```ts
for (const item of items) {
  await db.someTable.find(...)
}
```

or:

```ts
items.map(async item => ...)
```

with database calls.

Replace with:

```text
batch query
join/include
grouped query
Map-based lookup
```

where appropriate.

---

# 15. CACHING

Review all expensive read operations.

Determine whether data is:

```text
static
rarely changing
user-specific
company-specific
fiscal-year-specific
real-time
```

Use Next.js caching/revalidation appropriately.

Do NOT cache:

- user-specific data incorrectly
- authorization-sensitive data
- mutable ledger data without a proper invalidation strategy

For frequently changing business data, prioritize correctness over aggressive caching.

---

# 16. VERCEL OPTIMIZATION

This application is intended to run efficiently on Vercel.

Optimize for:

```text
low serverless execution time
low bandwidth
low database calls
low unnecessary renders
small client bundles
efficient data fetching
```

Avoid:

```text
polling
unnecessary API calls
large client-side data loads
huge JavaScript bundles
duplicate fetches
unnecessary middleware work
```

Do not optimize by sacrificing correctness.

---

# 17. SERVERLESS DATABASE CONNECTIONS

Inspect database initialization.

Ensure database clients are not repeatedly created unnecessarily during serverless execution.

Follow the project's ORM/database provider's recommended connection pattern.

Do not create a new database client inside every request unnecessarily.

---

# 18. CLIENT BUNDLE OPTIMIZATION

Review imports.

Look for large libraries imported into Client Components unnecessarily.

Move server-only libraries out of client code.

Avoid importing:

```text
database libraries
ORM clients
large server utilities
Node APIs
```

into Client Components.

Use dynamic imports only where they provide meaningful bundle savings.

Do not use dynamic imports everywhere.

---

# 19. COMPONENT SIZE

Identify components larger than approximately:

```text
300–500 lines
```

as candidates for review.

Do not split based only on line count.

Split by responsibility.

For example:

```text
ExpensePage
 ├── ExpenseFilters
 ├── ExpenseTable
 ├── ExpenseRow
 ├── ExpenseSummary
 └── ExpenseActions
```

The parent should coordinate.

Child components should own their presentation.

---

# 20. LARGE FORM REFACTORING

For large forms:

Separate:

```text
form state
validation
business logic
submission
presentation
```

Do not allow a form component to contain:

```text
database logic
duplicate detection
complex calculations
API response parsing
```

Extract those responsibilities.

---

# 21. STATE MANAGEMENT

Do not introduce Redux/Zustand globally just because the application is large.

First determine:

```text
local state
URL state
server state
global UI state
```

Use the simplest appropriate mechanism.

Prefer:

```text
React state
URL search params
Server Components
Server Actions
```

where sufficient.

Use React Query/SWR only where client-side server-state synchronization genuinely requires it.

---

# 22. URL STATE

Filters such as:

```text
fiscal year
date range
search
page
category
party
status
```

should often be represented in URL search parameters when appropriate.

This provides:

- refresh persistence
- shareable URLs
- browser navigation
- server-side rendering compatibility

Do not move transient UI state into the URL.

---

# 23. LOADING STATES

Use appropriate Next.js loading mechanisms:

```text
loading.tsx
Suspense
skeleton components
pending states
```

Avoid unnecessary global loading spinners.

Keep loading behavior localized.

---

# 24. ERROR BOUNDARIES

Add appropriate:

```text
error.tsx
not-found.tsx
```

for meaningful route segments where appropriate.

Do not expose internal exceptions.

Provide useful recovery actions.

---

# 25. ERROR ARCHITECTURE

Create consistent application errors.

For example:

```ts
class AppError extends Error {
  code: string;
  statusCode: number;
}
```

Possible categories:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
DATABASE_ERROR
INTERNAL_ERROR
```

Do not create excessive custom error classes.

Use a simple consistent strategy.

---

# 26. AUTHENTICATION

Review authentication boundaries.

Ensure protected resources are protected server-side.

Do not rely on:

```text
hidden buttons
client redirects
client state
```

for authorization.

Authentication:

```text
Who are you?
```

Authorization:

```text
Are you allowed to perform this operation?
```

Both must be enforced where required.

---

# 27. MULTI-TENANT / COMPANY DATA

If the application is company/tenant-based, treat tenant isolation as a critical security boundary.

Every database operation involving tenant-owned data must ensure:

```text
authenticated user
+
authorized company
+
requested resource
```

match correctly.

Never trust:

```text
companyId
```

sent by the browser.

Resolve or verify it server-side.

Prevent cross-company data leakage.

---

# 28. FISCAL YEAR DATA

For accounting/VAT features, ensure fiscal-year scoping is consistent.

Do not accidentally query:

```text
all fiscal years
```

when the operation should target:

```text
company + fiscal year
```

Duplicate rules, reports, ledgers, and summaries should all use the correct fiscal-year context.

---

# 29. MONEY HANDLING

Never use JavaScript floating-point calculations carelessly for financial persistence.

Use the application's existing money abstraction if available.

Centralize:

```text
rounding
VAT
taxable amount
VAT amount
total amount
```

Keep consistent precision between:

```text
UI
server
database
reports
```

---

# 30. DATE / NEPALI DATE HANDLING

Do not duplicate Nepali date/fiscal-year calculations.

Centralize:

```text
Miti parsing
Miti validation
fiscal year calculation
date conversion
```

Use the project's existing date utilities.

Do not introduce another date library unless genuinely necessary.

---

# 31. SEARCH AND FILTERING

Review search behavior.

Determine whether filtering should happen:

```text
database
server
client
```

For large datasets:

```text
database filtering
```

should generally be preferred.

Do not load thousands of records into the browser merely to filter them.

---

# 32. PAGINATION

Review every list/table.

Avoid unbounded queries.

Use appropriate pagination.

For large datasets consider:

```text
cursor pagination
```

where appropriate rather than loading everything.

Keep the UX appropriate for accounting/business workflows.

---

# 33. TABLE PERFORMANCE

For large interactive tables:

First optimize:

```text
data size
rendering
derived calculations
state updates
memoization
```

Only introduce virtualization if actual row counts justify it.

Do not add virtualization prematurely.

---

# 34. DUPLICATE CODE

Search the entire repository for duplicated:

```text
validation
VAT calculation
fiscal-year calculation
formatting
permission checks
database queries
API response mapping
error handling
```

Consolidate only when the duplicated logic represents the same business rule.

Do not merge unrelated functions just because they look similar.

---

# 35. UTILITY FUNCTIONS

Avoid giant:

```text
utils.ts
helpers.ts
common.ts
```

files containing unrelated functions.

Prefer domain-specific utilities:

```text
money.ts
nepali-date.ts
invoice.ts
permissions.ts
pagination.ts
```

---

# 36. TYPE SAFETY

Search for:

```ts
any
unknown as SomeType
@ts-ignore
@ts-expect-error
```

Review each occurrence.

Replace unsafe typing where practical.

Do not use type assertions to hide real bugs.

Prefer inference and schema-derived types where appropriate.

---

# 37. API RESPONSE TYPES

Avoid inconsistent API response shapes.

Standardize where appropriate:

```ts
{
  ok: true,
  data
}
```

or the project's established convention.

Do not create multiple incompatible response formats for similar operations.

---

# 38. ENVIRONMENT VARIABLES

Review environment variable usage.

Server-only secrets must never be exposed through:

```text
NEXT_PUBLIC_*
```

or Client Components.

Validate required environment variables at startup/build time where practical.

Do not hardcode:

```text
database URLs
secret keys
tokens
credentials
```

---

# 39. SECURITY REVIEW

Perform a focused security review for:

```text
SQL/ORM injection
authorization bypass
tenant isolation
IDOR
CSRF where relevant
XSS
unsafe HTML
file uploads
path traversal
secret exposure
sensitive logging
rate abuse
```

Do not implement unrelated security products.

Fix concrete vulnerabilities found in the codebase.

---

# 40. LOGGING

Replace scattered:

```ts
console.log()
```

with an appropriate logging strategy where needed.

Do not log:

```text
passwords
tokens
credentials
full sensitive payloads
personal financial information
```

Keep production logs useful and concise.

---

# 41. FILE UPLOADS

If the application has uploads:

Review:

```text
file size
MIME type
extension
storage location
filename handling
authorization
virus/malware considerations
```

Never trust the filename or MIME type supplied by the browser.

---

# 42. BACKGROUND / EXPENSIVE WORK

Do not perform expensive operations directly inside request handlers if they can exceed serverless limits.

Identify:

```text
large imports
report generation
large exports
PDF generation
file processing
bulk operations
```

Determine whether they should be:

```text
streamed
batched
queued
background processed
```

Do not introduce infrastructure unless actually required.

---

# 43. BATCH OPERATIONS

For multi-row accounting operations:

Prefer:

```text
validate batch
prepare operations
execute efficient batch/database operation
return row-level results
```

Avoid:

```text
for each row
  separate network request
  separate database transaction
```

when a safe batch operation is possible.

Partial success behavior must be explicitly defined.

---

# 44. AUDITABILITY

For business-critical accounting operations, identify whether the application needs:

```text
createdBy
updatedBy
createdAt
updatedAt
deletedBy
deletedAt
```

and/or audit history.

Do not add an audit system blindly.

If an existing audit mechanism exists, preserve and centralize its usage.

---

# 45. SOFT DELETE

If the application uses soft deletion, ensure all normal queries consistently respect:

```text
deletedAt IS NULL
```

Do not accidentally expose deleted accounting records.

Do not introduce soft deletion if the application currently uses hard deletion without understanding the business requirement.

---

# 46. TRANSACTIONAL BUSINESS OPERATIONS

For operations such as:

```text
invoice creation
expense creation
ledger update
party changes
bulk import
```

identify whether they are atomic business operations.

If yes:

```text
validate
→ transaction
→ commit
```

If no:

document the intended partial-success behavior.

---

# 47. CACHING + INVALIDATION

Whenever a mutation changes data used by cached pages/components:

Review:

```text
revalidatePath
revalidateTag
cache invalidation
router refresh
```

Avoid stale accounting information.

Do not blindly call:

```text
revalidate everything
```

after every mutation.

Invalidate only what is affected.

---

# 48. IMPORT / EXPORT

If Excel/CSV/PDF functionality exists:

Review:

```text
memory usage
large file handling
validation
authorization
file size
streaming
database batching
```

Do not load extremely large files completely into memory if avoidable.

---

# 49. PERFORMANCE BUDGET

After refactoring, evaluate:

```text
database queries/request
server execution time
client JavaScript
number of API requests
large component renders
```

Prioritize actual bottlenecks.

Do not claim performance improvements without evidence.

---

# 50. DEPENDENCY REVIEW

Inspect `package.json`.

Identify:

```text
unused dependencies
duplicate libraries
heavy dependencies
outdated dependencies
client-only dependencies
```

Do not upgrade everything during the refactor.

Do not perform major version upgrades unless specifically required.

---

# 51. IMPORT BOUNDARIES

Ensure server-only modules cannot accidentally be imported into client code.

Use clear separation such as:

```text
lib/server/*
lib/client/*
```

where useful.

Do not import:

```text
database
filesystem
server secrets
Node-only APIs
```

into Client Components.

---

# 52. TEST ARCHITECTURE

Prioritize tests around business logic.

Test:

```text
validation
VAT
fiscal year
duplicate detection
permissions
tenant isolation
batch operations
database constraints
```

Do not spend most test effort snapshot-testing simple UI markup.

---

# 53. REFACTOR IN SMALL STEPS

Do not produce one enormous rewrite.

Use this order:

```text
Step 1
Understand architecture

Step 2
Extract pure business logic

Step 3
Improve types

Step 4
Fix validation

Step 5
Fix data access

Step 6
Separate Server/Client boundaries

Step 7
Refactor large components

Step 8
Optimize database queries

Step 9
Improve caching

Step 10
Improve error/security handling

Step 11
Add tests

Step 12
Run lint/typecheck/build/tests
```

After each significant step, verify that the project still builds.

---

# 54. DO NOT CHANGE BUSINESS BEHAVIOR

Unless explicitly justified, preserve:

```text
VAT rules
fiscal year rules
invoice rules
party behavior
category behavior
permissions
report calculations
accounting calculations
existing workflows
```

If you discover a potentially incorrect business rule:

DO NOT silently change it.

Document:

```text
Current behavior
Potential issue
Recommended change
Reason
```

and keep the existing behavior unless the task explicitly authorizes the change.

---

# 55. FINAL QUALITY STANDARD

The final codebase should demonstrate:

### Architecture

```text
Clear feature boundaries
Clear server/client boundaries
One-way dependencies
```

### Code

```text
Small focused modules
Strong TypeScript
Minimal duplication
Pure business logic
```

### Database

```text
Efficient queries
Proper indexes
Correct transactions
Database constraints
```

### Security

```text
Authentication
Authorization
Tenant isolation
Input validation
No secret leakage
```

### Performance

```text
Small client bundles
Minimal API calls
Efficient database access
Appropriate caching
Minimal unnecessary rendering
```

### Reliability

```text
Typed errors
Race-condition handling
Partial batch handling
Consistent validation
```

### Maintainability

A new developer should be able to answer quickly:

```text
Where is this feature's UI?
Where is its validation?
Where is its business logic?
Where is its database access?
Where is authorization?
Where are its tests?
```

---

# 56. FINAL AGENT REPORT

After completing the refactor, output:

## 1. Architecture Before

Briefly describe the major problems found.

## 2. Architecture After

Show:

```text
app
features
components
lib
database
actions
services
repositories
```

as applicable.

## 3. Changed Files

For every changed file:

```text
file
purpose
reason for change
```

## 4. Business Logic

Confirm what was preserved.

## 5. Bugs Fixed

Only list actual bugs fixed.

## 6. Performance

Report concrete improvements:

```text
queries reduced
duplicate calculations removed
client code reduced
unnecessary requests removed
```

Only report measurable/verified improvements.

## 7. Security

Report actual security improvements.

## 8. Tests

List tests added.

## 9. Verification

Run and report:

```text
TypeScript: PASS/FAIL
Lint: PASS/FAIL
Unit Tests: PASS/FAIL
Integration Tests: PASS/FAIL
Build: PASS/FAIL
```

## 10. Remaining Technical Debt

List only genuine remaining issues.

---

# ABSOLUTE RULES

1. Do not rewrite everything.
2. Do not change business rules silently.
3. Do not introduce unnecessary dependencies.
4. Do not add Redux/Zustand without justification.
5. Do not turn Server Components into Client Components unnecessarily.
6. Do not trust client authorization.
7. Do not trust client validation as database protection.
8. Do not expose server secrets.
9. Do not perform unnecessary API calls from Server Components.
10. Do not use `any` to hide errors.
11. Do not ignore TypeScript errors.
12. Do not swallow important exceptions.
13. Do not optimize without understanding the bottleneck.
14. Do not introduce abstractions without a clear responsibility.
15. Do not modify unrelated features.
16. Preserve existing UX unless fixing a clear defect.
17. Database constraints must protect critical business invariants.
18. Financial calculations must be deterministic and consistent.
19. Tenant/company data must never cross authorization boundaries.
20. Correctness comes before performance.

## FINAL PRINCIPLE

Treat this as a real production accounting/business application.

Do not optimize for the shortest code.

Optimize for:

```text
Correctness
Security
Maintainability
Performance
Scalability
Developer Experience
```

in that order.

The resulting application should be easy to extend with new features without causing existing features to become increasingly difficult to maintain.