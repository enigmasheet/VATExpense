# Plan: Complete CRUD + FY Auto-Creation

**Branch**: `feature/complete-crud-and-fy-auto`

## Summary

1. MasterPage multi-field inline edit (all fields except isActive)
2. Remove isActive from create/edit forms (report filter only, badge toggle stays)
3. FY auto-creation from expense miti date
4. Company edit page (SuperAdmin only)
5. Backend completeness (missing update schemas, Zod validation)

---

## Step 1: MasterPage Multi-Field Inline Edit

**File**: `src/components/master-page.tsx`

- `startEdit(item)` → populate all fields from item (not just `name`)
- Render proper input types for each field (text, number, select)
- `saveEdit()` → send all changed fields as PATCH body
- `isActive` excluded from edit — badge toggle only

This automatically fixes:
- Trucks: `ownerName`, `truckType` become editable
- Fiscal Years: `startYear`, `endYear` become editable

---

## Step 2: Remove isActive from Create Schemas

**File**: `src/lib/validation/masters.ts`

Remove `isActive` from:
- `createCategorySchema`
- `createLocationSchema`
- `createTruckSchema`
- `createFiscalYearSchema`
- `createPartySchema`

Keep `isActive` only in update schemas (for badge toggle).

---

## Step 3: Fiscal Years — Backend Update

**Files**:
- `src/lib/validation/masters.ts` — Add `updateFiscalYearSchema` with `startYear`, `endYear`
- `src/lib/services/fiscal-years.ts` — Add `startYear`, `endYear` to `updateFiscalYear`
- `src/app/api/fiscal-years/[id]/route.ts` — Handle `startYear`, `endYear` in PATCH
- `src/lib/actions/fiscal-years.ts` — Add `startYear`, `endYear` to update function

---

## Step 4: Categories/Locations — Use Zod Validation

**Files**:
- `src/lib/validation/masters.ts` — Add `updateCategorySchema`, `updateLocationSchema`
- `src/app/api/categories/[id]/route.ts` — Use `updateCategorySchema`
- `src/app/api/locations/[id]/route.ts` — Use `updateLocationSchema`

---

## Step 5: Companies — Full Update Infrastructure

**New files**:
- `src/lib/services/companies.ts` — `updateCompany`, `deleteCompany`
- `src/lib/actions/companies.ts` — Server actions
- `src/app/api/companies/[id]/route.ts` — PATCH + DELETE (superadmin only)
- `src/app/companies/edit/page.tsx` — Standalone edit page

**Modified**:
- `src/lib/validation/masters.ts` — Add `updateCompanySchema`
- `src/components/layout/nav-config.ts` — Add "Company" nav item (superadmin only)

---

## Step 6: FY Auto-Creation from Expense Date

**Backend**:
- `src/lib/actions/expenses-helpers.ts` — Add `resolveFiscalYear(companyId, miti)` function
- `src/lib/validation/expense.ts` — Make `fiscalYearId` optional
- `src/app/api/expenses/route.ts` — Auto-resolve FY if `fiscalYearId` missing

**Frontend**:
- `src/components/expenses/expense-form.tsx` — Remove FY dropdown (auto-resolved)
- `src/components/expenses/batch-entry.tsx` — Same change

**Behavior**:
- `parseMiti(miti)` → computes FY name (e.g., "2081/82")
- Look up FY by `companyId` + `name`
- If not found → auto-create with `isActive: true`
- Return `fiscalYearId` for the expense

---

## Step 7: Tests

- Update validation tests for new schemas
- Add tests for FY auto-creation logic

---

## Files Summary

### New Files (4)
| File | Purpose |
|------|---------|
| `src/lib/services/companies.ts` | Company update/delete |
| `src/lib/actions/companies.ts` | Server actions |
| `src/app/api/companies/[id]/route.ts` | PATCH + DELETE |
| `src/app/companies/edit/page.tsx` | Edit page |

### Modified Files (~15)
| File | Change |
|------|--------|
| `src/components/master-page.tsx` | Multi-field edit |
| `src/lib/validation/masters.ts` | Add update schemas, remove isActive from creates |
| `src/lib/services/fiscal-years.ts` | Add startYear/endYear to update |
| `src/lib/actions/fiscal-years.ts` | Add startYear/endYear |
| `src/app/api/fiscal-years/[id]/route.ts` | Handle startYear/endYear |
| `src/app/api/categories/[id]/route.ts` | Use Zod schema |
| `src/app/api/locations/[id]/route.ts` | Use Zod schema |
| `src/lib/actions/expenses-helpers.ts` | FY auto-resolve |
| `src/lib/validation/expense.ts` | Optional fiscalYearId |
| `src/app/api/expenses/route.ts` | FY auto-resolve |
| `src/components/expenses/expense-form.tsx` | Remove FY dropdown |
| `src/components/expenses/batch-entry.tsx` | Remove FY dropdown |
| `src/components/layout/nav-config.ts` | Add Company nav |
| `src/lib/validation/__tests__/masters.test.ts` | Update tests |
