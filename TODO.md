# TODO

Pending work items. Both the user and agents append tasks here. Mark items `- [x]` when done.

---

## Import Pipeline

- [ ] Per-row fiscal year resolution in import — resolve each row's FY from its miti, auto-create if missing. Deferred by user. | Priority: high | Files: `src/app/api/import/[batchId]/confirm/route.ts`, `preview/route.ts`

## Batch Entry

- [ ] Smart Fix button — hide when error is not auto-fixable. | Priority: medium | Files: `src/lib/expenses/ledger-validation.ts`, `src/lib/expenses/ledger-reducer.ts`, `src/components/expenses/ledger-table.tsx`
- [ ] Batch entry form redesign — sticky mobile action bar, empty state, alternating rows. | Priority: low | Files: `src/components/expenses/ledger-grid.tsx`, `src/components/expenses/ledger-table.tsx`

## UI Polish

- [ ] Navigation active state — ensure child items use exact match for active detection. | Priority: low | Files: `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`
