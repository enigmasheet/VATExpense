# Future Features — Detailed Implementation Plans

> These features are planned for future implementation. Each includes scope, technical approach, and dependencies.

---

## Feature A: Expense PDF/Invoice Export

### Overview
Export individual expenses or batches as PDF invoices with company branding, BS dates, and VAT breakdown.

### Scope
- New API route: `src/app/api/expenses/[id]/export/route.ts` — generates PDF for single expense
- New API route: `src/app/api/export/expenses/route.ts` — generates PDF for filtered expense list
- Use `jspdf` + `jspdf-autotable` for lightweight PDF generation (no heavy React PDF rendering)
- Include: company name, VAT number, expense details, BS date, amounts
- Add "Export PDF" button on expense detail page and expense list (bulk selection)

### Technical Approach
```typescript
// src/app/api/expenses/[id]/export/route.ts
// 1. Fetch expense with joins (party, category, location, truck)
// 2. Fetch company details for header
// 3. Generate PDF with jspdf:
//    - Header: Company name, address, VAT number
//    - Table: Expense details (Miti, Invoice, Party, Item, Qty, Rate, Taxable, VAT, Total)
//    - Footer: Date, page number
// 4. Return as PDF response
```

### Dependencies
- Install `jspdf` and `jspdf-autotable`

### UI Changes
- Expense detail page: Add "Export PDF" button next to "Edit" button
- Expense list: Add checkbox selection + "Export Selected as PDF" in bulk toolbar

---

## Feature B: Dashboard Charts

### Overview
Add visual charts to the dashboard for spending trends and category breakdowns.

### Scope
- Install `recharts` (lightweight, React-native charting)
- New component: `src/components/dashboard-charts.tsx`
  - **Monthly spending bar chart** — shows expense totals per Nepali month for active FY
  - **Category pie/donut chart** — shows spending breakdown by category
  - **Party spending comparison** — horizontal bar chart of top 10 parties
- Integrate into `src/components/dashboard-client.tsx` below stat cards
- Fetch data from existing report APIs or new aggregation endpoint
- Responsive: charts stack on mobile

### Technical Approach
```typescript
// src/components/dashboard-charts.tsx
// Uses recharts: BarChart, PieChart, Bar, Pie, Cell, Tooltip, Legend
// Data fetched from /api/reports/fiscal-year and /api/reports/parties
// Color palette from Tailwind theme colors
```

### Dependencies
- Install `recharts`

### UI Changes
- Dashboard: Add 3 charts below stat cards in a responsive grid
- Mobile: Charts stack vertically, PieChart becomes smaller

---

## Feature C: Bulk Operations on Expenses

### Overview
Select multiple expenses via checkboxes and perform batch actions.

### Scope
- Modify `src/components/expenses-list-client.tsx`:
  - Add checkbox column to expense table
  - Add "Select All" checkbox in header
  - Add bulk action toolbar (appears when selection > 0):
    - "Delete Selected" — soft-deletes multiple expenses
    - "Export Selected (Excel)" — exports selected rows
    - "Change Category" — reassigns category for selected expenses
- New API route: `src/app/api/expenses/bulk/route.ts`
  - `POST /api/expenses/bulk/delete` — soft-deletes multiple expenses by IDs
  - `POST /api/expenses/bulk/category` — reassigns category for multiple expenses
- Add confirmation dialog before bulk delete
- Show count of selected items and affected rows

### Technical Approach
```typescript
// Bulk delete: tx.update(expenses).set({isDeleted: true}).where(inArray(expenses.id, ids))
// Bulk category: tx.update(expenses).set({categoryId}).where(inArray(expenses.id, ids))
// Both wrapped in transactions for atomicity
```

### Dependencies
- None

### UI Changes
- Expense list: Add checkbox column, bulk action toolbar
- Confirmation dialog for destructive actions

---

## Feature D: Expense Templates / Recurring Expenses

### Overview
Save common expense patterns as templates and generate expenses from them.

### Scope
- New schema: `expense_templates` table
  - `id` (uuid, PK)
  - `companyId` (uuid, FK → companies)
  - `name` (text, NOT NULL)
  - `partyId` (uuid, FK → parties)
  - `categoryId` (uuid, FK → categories)
  - `locationId` (uuid, nullable, FK → locations)
  - `truckId` (uuid, nullable, FK → trucks)
  - `item` (text, NOT NULL)
  - `quantity` (numeric, nullable)
  - `rate` (numeric, nullable)
  - `vatRate` (numeric, nullable)
  - `createdAt`, `updatedAt` (timestamps)
- New migration
- New service: `src/lib/services/expense-templates.ts`
- New API routes: `src/app/api/expense-templates/` (CRUD)
- New page: `src/app/expense-templates/page.tsx` — list and manage templates
- "Save as Template" button on expense detail page
- "Create from Template" button/shortcut on expense create page — pre-fills form
- Optional: recurring schedule (monthly, weekly) with auto-generation via cron

### Technical Approach
```sql
CREATE TABLE expense_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  party_id UUID NOT NULL REFERENCES parties(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  location_id UUID REFERENCES locations(id),
  truck_id UUID REFERENCES trucks(id),
  item TEXT NOT NULL,
  quantity NUMERIC,
  rate NUMERIC,
  vat_rate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Dependencies
- None

---

## Feature E: User Management & Role UI

### Overview
Admin page for managing users within a company.

### Scope
- New page: `src/app/admin/users/page.tsx`
- New API routes:
  - `GET /api/admin/users` — list users for a company
  - `PATCH /api/admin/users/[id]` — change role (Admin, DataEntry)
  - `DELETE /api/admin/users/[id]` — deactivate user (set `isActive: false`)
- Modify existing `POST /api/admin/companies` to accept optional `users` array for inviting multiple users
- Role-based access: only Admin/SuperAdmin can manage users
- Display: user email, name, role badge, active/inactive status

### Technical Approach
```typescript
// List users: db.select().from(users).where(eq(users.companyId, companyId))
// Update role: db.update(users).set({role}).where(eq(users.id, id))
// Deactivate: db.update(users).set({isActive: false}).where(eq(users.id, id))
```

### Dependencies
- None

---

## Feature F: Audit Trail / Activity Log

### Overview
Track who created/modified/deleted expenses and master entities.

### Scope
- New schema: `audit_logs` table
  - `id` (uuid, PK)
  - `companyId` (uuid, FK → companies)
  - `entityType` (text: 'expense', 'party', 'category', 'location', 'truck', 'fiscal_year')
  - `entityId` (uuid)
  - `action` (text: 'create', 'update', 'delete')
  - `changes` (jsonb: { field: { old: value, new: value } })
  - `performedBy` (uuid, FK → users)
  - `createdAt` (timestamp)
- New migration
- New helper: `src/lib/audit.ts` — `logAudit(companyId, entityType, entityId, action, changes, userId)`
- Wire into all expense CRUD operations (create, update, delete)
- Wire into master entity CRUD operations
- New page: `src/app/admin/audit-log/page.tsx` — filterable table
- New API route: `src/app/api/admin/audit-log/route.ts` — paginated query with filters

### Technical Approach
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_company_idx ON audit_logs(company_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
```

### Dependencies
- Fix #5 (populate `createdBy`/`updatedBy`) should be done first (COMPLETED)

---

## Feature G: Multi-Company Dashboard (SuperAdmin)

### Overview
SuperAdmin view showing all companies with aggregated stats.

### Scope
- New page: `src/app/admin/companies-overview/page.tsx`
- New API route: `src/app/api/admin/companies-overview/route.ts`
- Display: table/cards for each company showing:
  - Company name, VAT number
  - Total expenses count and amount (current FY)
  - Number of parties, categories, locations
  - Last activity date
  - Active/inactive status
- Click-through to company-specific views
- Summary row at top: total companies, total expenses, total VAT

### Technical Approach
```typescript
// Aggregate query: SELECT c.*, COUNT(e.id), SUM(e.totalAmount) FROM companies c
//   LEFT JOIN expenses e ON e.company_id = c.id AND e.is_deleted = false
//   GROUP BY c.id
```

### Dependencies
- None

---

## Implementation Priority

| Priority | Feature | Effort | Business Value |
|----------|---------|--------|----------------|
| 1 | Feature B: Dashboard Charts | 3-4h | High — visual insights |
| 2 | Feature A: PDF Export | 4-6h | High — VAT compliance |
| 3 | Feature C: Bulk Operations | 4-5h | High — productivity |
| 4 | Feature F: Audit Trail | 6-8h | High — compliance |
| 5 | Feature E: User Management | 3-4h | Medium — admin usability |
| 6 | Feature D: Expense Templates | 5-7h | Medium — recurring entries |
| 7 | Feature G: Multi-Company Dashboard | 3-4h | Low — SuperAdmin only |
