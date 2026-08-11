# AI CODING AGENT — Refactor LedgerGrid Safely

You are now responsible for implementing the refactor of the uploaded `LedgerGrid` component.

The goal is to make the existing ledger **more maintainable, predictable, testable, and efficient without changing its business behavior or user experience**.

## CRITICAL RULE

Do NOT blindly rewrite the entire component.

Work incrementally.

Before changing code:

1. Read the complete `LedgerGrid` implementation.
2. Identify all current behaviors.
3. Identify dependencies used by the component.
4. Identify the contract of `batchSaveExpenses`.
5. Identify the behavior of:
   - `parseMiti`
   - `FISCAL_YEAR_START_MONTH`
   - `VAT_RATE`
   - `round2`
   - `BatchRowInput`
6. Preserve the existing UI and keyboard workflow.

Do not modify unrelated files.

---

# PHASE 1 — Analyze Before Editing

Create a short internal refactoring plan.

Identify:

### State

Current state includes:

```text
rows
existingInvoices
saving
saveResult
statusMessage
```

Determine which state is:

- source of truth
- derived state
- temporary UI state

Do not store values in React state if they can safely be derived.

---

# PHASE 2 — Establish Domain Types

Create a dedicated type module if useful:

```text
lib/expenses/ledger-types.ts
```

Define strong types for:

```text
LedgerEntry
LedgerRow
LedgerRowStatus
ValidationResult
LedgerTotals
```

Do not introduce unnecessary abstraction.

The type model must remain easy to understand.

---

# PHASE 3 — Extract Pure Business Logic

Create focused modules.

Recommended:

```text
lib/expenses/ledger-calculation.ts
lib/expenses/ledger-validation.ts
lib/expenses/ledger-utils.ts
```

Extract:

```text
calcFromTaxable()
calcFromTotal()
getFiscalYearFromMiti()
getInvoiceKey()
normalizeInvoiceNumber()
validateLedgerRow()
calculateLedgerTotals()
createLedgerRow()
```

Every extracted business function should be:

- pure
- deterministic
- independently testable
- free from React dependencies

Do not access React state from these functions.

---

# PHASE 4 — Fix Validation Architecture

The current implementation validates the same row more than once.

Do not do:

```text
validateRow()
getRowStatus()
    ↓
validateRow()
```

Instead:

```ts
const validation = validateLedgerRow(...);
```

and derive:

```ts
status
error
warnings
```

from that single result.

Create one validation pipeline.

Example conceptual flow:

```text
Row
 ↓
validate
 ↓
ValidationResult
 ↓
status/error/warnings
```

Do not duplicate validation rules.

---

# PHASE 5 — Optimize Duplicate Detection

Do not perform a full:

```ts
rows.filter(...)
```

for every row during every render.

Build an index once.

For example:

```ts
Map<InvoiceKey, number>
```

or:

```ts
Set<InvoiceKey>
```

Use a consistent invoice key function:

```ts
getInvoiceKey(partyId, invoiceNumber)
```

Normalize invoice numbers according to the application's existing business rules.

The business uniqueness concept should remain:

```text
Fiscal Year
+
Party
+
Invoice Number
```

If the existing backend uses a different exact uniqueness rule, inspect it and follow the backend.

Do not invent a new business rule.

---

# PHASE 6 — Preserve Client + Server Validation

Client validation is for immediate UX.

Server validation is authoritative.

Never remove client duplicate detection.

Never rely exclusively on it either.

The final flow must be:

```text
Client validation
      ↓
Prevent obvious invalid submission
      ↓
Server action
      ↓
Database validation / unique constraint
      ↓
Result mapped back to exact row
```

If a duplicate appears between client validation and save, handle the server rejection correctly.

---

# PHASE 7 — Refactor Row Updates

Current `updateRow()` handles multiple unrelated responsibilities:

- generic field updates
- status reset
- taxable calculation
- total calculation
- category lookup

Split these logically.

For example:

```text
updateRowField()
updateAmountsFromTaxable()
updateAmountsFromTotal()
updateCategory()
updateParty()
```

You do NOT necessarily need all of these as separate public functions.

A reducer may be preferable if it makes state transitions clearer.

Choose the simplest maintainable approach.

---

# PHASE 8 — Consider useReducer

Evaluate whether `useReducer` is appropriate for the ledger.

The component has many row operations:

```text
UPDATE_FIELD
SELECT_PARTY
UPDATE_PARTY_SEARCH
ADD_ROW
REMOVE_ROW
DUPLICATE_ROW
START_SAVE
SAVE_SUCCESS
SAVE_ERROR
CLEAR_SAVED
```

If `useReducer` clearly improves predictability, use it.

Possible model:

```ts
type LedgerAction =
  | ...
```

But do NOT introduce `useReducer` merely because it is an advanced React feature.

If functional `useState` remains simpler, keep it.

The final code should optimize for maintainability, not abstraction count.

---

# PHASE 9 — Fix Row ID Generation

Do not keep module-level mutable state:

```ts
let nextId = 1;
```

because multiple component instances can share that mutable counter.

Use a collision-safe row ID strategy.

Preferred:

```ts
crypto.randomUUID()
```

or another stable local identifier.

The ID must remain stable for the lifetime of a row.

---

# PHASE 10 — Refactor Save Pipeline

Extract batch saving into a dedicated hook or service.

Suggested:

```text
hooks/expenses/useLedgerSave.ts
```

or:

```text
lib/expenses/ledger-save.ts
```

The save pipeline should be:

```text
get valid pending rows
        ↓
mark those rows as saving
        ↓
build BatchRowInput[]
        ↓
batchSaveExpenses()
        ↓
map results to row IDs
        ↓
update all rows in one state update
        ↓
update existing invoice index
        ↓
return save summary
```

Avoid repeatedly calling:

```ts
setRows()
```

inside the result loop.

Instead, calculate the next row collection and update state once whenever practical.

---

# PHASE 11 — Preserve Row-to-Result Mapping

Current logic depends on:

```ts
pending[r.index]
```

Do not assume array indexes are permanently safe.

Create a clear mapping:

```text
clientRowId → batch item
```

If the backend supports adding a client row ID, use it.

If changing the backend contract is undesirable, maintain an explicit mapping in the client.

The result must always update the correct original row.

---

# PHASE 12 — Async Safety

Review all asynchronous operations.

Especially:

```text
existing invoice fetch
batch save
```

Prevent stale requests.

Example scenario:

```text
User selects FY A
↓
request A starts

User selects FY B
↓
request B starts

request A finishes after request B
```

Request A must not overwrite FY B's invoice index.

Use:

```text
AbortController
request ID
mounted/request validity guard
```

where appropriate.

Do not over-engineer.

---

# PHASE 13 — Improve Existing Invoice Loading

Current code fetches:

```text
/api/expenses
```

with:

```text
pageSize=500
```

Review whether this is sufficient for the application's actual business requirements.

Do not silently assume 500 records is enough to guarantee duplicate detection.

If the existing API can return all relevant invoice keys efficiently, use that.

If not, propose the smallest backend improvement:

```text
GET /api/expenses/invoice-keys
```

returning only:

```ts
{
  partyId: string;
  invoiceNumber: string;
}
```

for the selected company/fiscal year.

Do not load unnecessary expense fields merely for duplicate detection.

---

# PHASE 14 — Party Autocomplete

Keep `PartyAutocomplete` as a separate component.

Improve its internal logic without changing its UI.

Requirements:

- keyboard navigation remains
- ArrowUp remains
- ArrowDown remains
- Enter selects
- Escape closes
- Tab closes
- outside click closes
- portal positioning remains
- selected party remains visually indicated

Avoid unnecessary searches.

Normalize search data once when `allParties` changes.

If appropriate, create a searchable index.

Do not introduce server search unless party volume actually requires it.

---

# PHASE 15 — Party State Correctness

This is important.

When a user changes:

```text
Party A
```

to:

```text
Party B / arbitrary text
```

the old:

```text
partyId
locationId
locationName
partyResolved
```

must not remain attached to the row.

Correct behavior:

```text
New unresolved text
→ partyId = ""
→ partyResolved = false
→ locationId = null
→ locationName = null
```

When a valid party is selected:

```text
partyId
partyName
locationId
locationName
partyResolved = true
```

must be updated together.

Avoid stale entity data.

---

# PHASE 16 — Amount Editing

Maintain the existing behavior.

### When taxable changes

```text
taxable
    ↓
VAT
    ↓
total
```

### When total changes

```text
total
    ↓
taxable
    ↓
VAT
```

Create pure calculation helpers.

Do not make the displayed VAT independently editable.

VAT must remain derived.

Use the existing:

```text
VAT_RATE
round2
```

Do not hardcode a different VAT rate.

---

# PHASE 17 — Monetary Safety

Review every use of:

```ts
Number(...)
parseFloat(...)
```

Make sure invalid values cannot silently become valid zero values when that would hide an input error.

Distinguish:

```text
empty
invalid
zero
positive
negative
```

where validation requires it.

Do not allow:

```text
NaN
Infinity
negative values
```

to reach the save payload.

The UI can continue to use strings for editable numeric inputs.

Convert to validated numeric values only at the business boundary.

---

# PHASE 18 — Fiscal Year Logic

Extract:

```ts
getFiscalYearFromMiti()
```

Use:

```text
parseMiti()
FISCAL_YEAR_START_MONTH
```

Do not duplicate fiscal-year calculations.

The validation should clearly express:

```text
Miti
 ↓
parse
 ↓
calculate fiscal year
 ↓
compare selected fiscal year
 ↓
valid/invalid
```

Preserve the current Nepali fiscal-year convention.

---

# PHASE 19 — Keyboard Navigation

Do not break keyboard entry.

Preserve:

```text
Enter
Shift+Enter
Tab
Shift+Tab
F2
Escape
Ctrl+Enter
```

Extract navigation logic if it improves readability.

Centralize:

```ts
FIELD_ORDER
```

and focus behavior.

Avoid duplicated selectors.

---

# PHASE 20 — UI Component Structure

Refactor the large component into logical components.

Recommended:

```text
LedgerGrid
 ├── LedgerRow
 │    ├── PartyAutocomplete
 │    └── StatusBadge
 │
 ├── LedgerSummary
 │
 └── LedgerActions
```

Do not move business logic into presentation components.

UI components should receive data and callbacks.

Business rules should live in hooks/utilities.

---

# PHASE 21 — Derived Data

Use memoization only where it provides value.

Potential derived values:

```text
validatedRows
totals
pendingCount
savedCount
duplicateIndex
```

Do not blindly add `useMemo` everywhere.

A memo should exist because:

```text
calculation is expensive
OR
stable reference matters
```

not merely because memoization is available.

---

# PHASE 22 — Rendering Performance

For every row render, avoid:

```text
find()
filter()
toLowerCase()
duplicate calculations
```

where an indexed/precomputed result can be used.

Especially review:

```text
allCategories.find(...)
allParties.find(...)
allRows.filter(...)
```

inside frequently executed paths.

However, do not sacrifice readability for micro-optimizations.

Optimize the actual expensive paths.

---

# PHASE 23 — Error Handling

Remove silent error swallowing such as:

```ts
.catch(() => {});
```

Errors should become meaningful application state.

For example:

```text
Unable to load existing invoices.
Please retry.
```

Do not display:

```text
database stack traces
SQL errors
internal exception details
```

to users.

---

# PHASE 24 — Testing

Add tests for extracted pure logic.

Minimum test groups:

### `ledger-calculation.test.ts`

```text
taxable calculation
total calculation
VAT rounding
decimal values
zero
negative
```

### `ledger-validation.test.ts`

```text
empty row
invalid Miti
wrong fiscal year
unresolved party
missing invoice
missing category
invalid amount
existing invoice
batch duplicate
valid row
```

### `ledger-utils.test.ts`

```text
invoice normalization
invoice key generation
row creation
row duplication
```

Test business rules, not implementation details.

---

# PHASE 25 — Do Not Break the UI

The refactor must preserve:

- existing table columns
- existing labels
- existing buttons
- existing styling
- existing keyboard shortcuts
- existing party autocomplete
- existing VAT calculations
- existing row duplication
- existing deletion
- existing batch save
- existing partial save behavior
- existing summary cards
- existing status indicators

Only improve UX if the change is clearly bug-fixing and does not alter the intended workflow.

---

# PHASE 26 — Verify TypeScript

After refactoring:

Run:

```bash
npm run lint
```

and:

```bash
npx tsc --noEmit
```

or the project's equivalent commands.

Fix all TypeScript errors.

Do not use:

```ts
any
```

to bypass problems.

Do not suppress errors with:

```ts
@ts-ignore
```

unless there is a documented unavoidable reason.

---

# PHASE 27 — Verify Build

Run the project's production build.

For example:

```bash
npm run build
```

The refactor must not introduce:

- server/client boundary violations
- hydration errors
- browser-only APIs executed on the server
- invalid imports
- unused imports
- circular dependencies

Remember this is a Next.js App Router application.

---

# PHASE 28 — Review the Final Architecture

The final dependency direction should preferably look like:

```text
UI Components
      ↓
Hooks
      ↓
Pure Ledger Domain Logic
      ↓
Server Actions / API
      ↓
Database
```

Not:

```text
UI
 ↓
UI
 ↓
random helper
 ↓
state
 ↓
API
 ↓
another UI helper
```

Keep dependencies one-directional.

Avoid circular imports.

---

# PHASE 29 — Final Review Checklist

Before finishing, verify:

[ ] No business logic was accidentally removed.

[ ] No VAT behavior changed.

[ ] No fiscal-year behavior changed.

[ ] Duplicate validation still works.

[ ] Server remains authoritative for duplicates.

[ ] Party resolution cannot leave stale location data.

[ ] Batch save correctly maps results to rows.

[ ] Partial success works.

[ ] Failed rows remain editable.

[ ] Saved rows behave as before.

[ ] Keyboard navigation works.

[ ] Ctrl+Enter still saves.

[ ] F2 still duplicates.

[ ] Shift+Enter/Escape behavior remains consistent with the existing implementation.

[ ] Amount calculations are centralized.

[ ] Validation is not performed twice unnecessarily.

[ ] No O(n²) duplicate checking remains unnecessarily.

[ ] No module-level mutable row counter remains.

[ ] Async stale-response problems are handled.

[ ] Errors are not silently swallowed.

[ ] TypeScript passes.

[ ] Lint passes.

[ ] Production build passes.

[ ] Tests pass.

---

# FINAL OUTPUT FROM THE AGENT

After implementation, report:

## Changed

List each changed file and its purpose.

## Architecture

Show the final dependency/file structure.

## Business Logic Preserved

Explicitly confirm:

- VAT behavior
- fiscal-year behavior
- duplicate rules
- party resolution
- batch save
- keyboard workflow

## Performance Improvements

List the actual improvements made.

Do not claim performance improvements that were not actually implemented.

## Tests

List tests added and their results.

## Validation

Report:

```text
TypeScript: PASS/FAIL
Lint: PASS/FAIL
Tests: PASS/FAIL
Build: PASS/FAIL
```

## Potential Future Improvements

Only list improvements that are genuinely outside the current refactor scope.

Do not implement speculative features.

---

# MOST IMPORTANT INSTRUCTION

This is a **business-critical VAT expense ledger**.

Correctness is more important than clever architecture.

Prefer:

```text
simple + explicit + testable
```

over:

```text
abstract + clever + complicated
```

The final code should be something another experienced TypeScript developer can understand quickly and safely modify six months from now.