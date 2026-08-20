<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Codebase Map

### Tech Stack
- **Framework**: Next.js 16.3.0 (App Router), React 19.2.8, TypeScript
- **Database**: PostgreSQL (Neon/local) via Drizzle ORM
- **Auth**: NextAuth v5 (Credentials provider)
- **Styling**: Tailwind CSS v4 (CSS variables theme system)
- **Testing**: Vitest (25 test files, 400+ tests)
- **Package manager**: pnpm

### Commands
- `pnpm dev` — start dev server (port 3000)
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — Vitest

### Project Structure
```
src/
├── app/
│   ├── (protected)/          # Auth-required routes
│   │   ├── admin/            # Admin pages (companies, users, fiscal-years)
│   │   ├── expenses/         # Expense entry (ledger grid)
│   │   └── layout.tsx        # AppShell wrapper (sidebar + providers)
│   ├── api/                  # API routes
│   │   └── admin/            # Admin CRUD endpoints
│   └── auth/                 # Login/register pages
├── components/
│   ├── admin/                # Admin panel components
│   │   ├── companies-page.tsx     # Companies list + ProvisionPanel + CompanyEditPanel
│   │   ├── users-page.tsx         # Users list + UserFormPanel + ResetPasswordPanel
│   │   ├── fiscal-years-section.tsx
│   │   ├── provision-panel.tsx    # New company slide-over
│   │   ├── company-edit-panel.tsx # Edit company slide-over
│   │   ├── user-form-panel.tsx    # New/edit user slide-over
│   │   └── reset-password-panel.tsx
│   ├── expenses/             # Ledger grid, table, validation
│   ├── layout/               # Sidebar, mobile-nav, icons
│   └── ui/                   # Shared primitives
│       ├── modal.tsx          # Shared modal (center + right slide-over)
│       ├── slide-over.tsx     # Thin wrapper over Modal (position="right")
│       ├── confirm-dialog.tsx
│       ├── toast.tsx
│       └── ...
├── lib/
│   ├── api-client.ts         # fetch wrapper (api function, ApiError)
│   ├── use-api.ts            # useApi hook (SWR-like)
│   ├── useApp.tsx            # Global context (companyId, fiscalYearId)
│   ├── actions/              # Server actions
│   └── expenses/             # Ledger logic, validation, constants
└── db/                       # Drizzle schema + migrations
```

### Shared UI Patterns
- **Modal** (`src/components/ui/modal.tsx`): Shared primitive for both centered dialogs and right-side slide-overs. Drives entrance animation via RAF + `visible` state, exit via `closing` state with 200ms delay. Uses `shown = open && visible` for CSS transitions.
- **SlideOver** (`src/components/ui/slide-over.tsx`): Thin wrapper — passes `position="right"` to Modal.
- **ConfirmDialog** (`src/components/ui/confirm-dialog.tsx`): Destructive-action confirmation modal.
- **useApi** (`src/lib/use-api.ts`): Data fetching hook with loading/error states.
- **useApp** (`src/lib/useApp.tsx`): Global context providing `companyId`, `fiscalYearId`.

### Known Pitfall: Modal Visibility State Machine
The shared Modal uses a state machine with `open`, `closing`, and `visible` to drive entrance/exit CSS transitions:
- On open: `closing=false`, RAF sets `visible=true` (entrance transition plays).
- On close: `visible=false` immediately (exit transition), `closing=true` for 200ms (keeps DOM mounted), then unmounts.
- `shown = open && visible` — this must NEVER be `open=true && visible=false` for more than one frame (the RAF gap).

**Do NOT introduce render-phase setState resets** (the old `prevOpen !== open` pattern that was removed). They race the RAF and can leave the modal `open` but `opacity-0 pointer-events-none` (invisible, clicks pass through). The `closing` state is set in an effect (with inline eslint-disable) and is the correct pattern.
