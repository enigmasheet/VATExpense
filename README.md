# VAT Expense Ledger

Purchase invoice register for Nepali fiscal-year reporting. Tracks expenses by party, category, location, and Nepali month. Supports CSV/Excel import with auto-resolution of parties, categories, and locations.

## Tech Stack

- **Framework**: Next.js 16.3.0 (App Router), React 19.2.8, TypeScript
- **Database**: PostgreSQL (Neon or local) via Drizzle ORM 0.45
- **Auth**: NextAuth v5 (Credentials provider, JWT strategy)
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest
- **Package manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 11+
- PostgreSQL database (Neon recommended, or local)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Set your DATABASE_URL and AUTH_SECRET in .env.local

# Generate and push schema to database
pnpm db:generate
pnpm db:push

# Seed with test data (optional)
pnpm db:seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth secret (`openssl rand -base64 32`) |
| `SUPERADMIN_EMAIL` | No | Superadmin login (env-based, no DB row) |
| `SUPERADMIN_PASSWORD` | No | Superadmin password |
| `ALLOW_DB_RESET` | No | Enable `POST /api/admin/reset` (truncates all data) |

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (port 3000) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest (watch mode) |
| `pnpm test:run` | Vitest (single run) |
| `pnpm test:coverage` | Vitest with coverage |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed database with test data |

## Features

- **Expense Entry**: Single form or batch ledger grid with keyboard navigation
- **CSV/Excel Import**: Upload → preview → fix suggestions → confirm pipeline
- **Fiscal Year Management**: Auto-resolution from dates, manual CRUD
- **Reports**: Fiscal year summary, monthly breakdown, party statements
- **Exports**: CSV + XLSX download
- **Master Data**: Parties, categories, locations, trucks with fuzzy matching
- **Duplicate Detection**: Invoice-level duplicate and suspicious-duplicate warnings
- **Multi-company**: Company-scoped data with admin panel

## Project Structure

See [AGENTS.md](AGENTS.md) for full architecture documentation.

## Maintenance & Docs

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Full architecture, conventions, pitfalls — primary agent reference |
| [PLAN.md](PLAN.md) | Enhancement plan + TODO checklist + open PR review status |
| [CHANGELOG.md](CHANGELOG.md) | Release notes and unreleased changes |

### Audit & Review

Two open PRs await review and merge:
- **#12 `feature/backend-audit`** — Phase 1 (security) + Phase 2 (data integrity). 2 commits, no review yet.
- **#11 `feature/phase3-audit-hardening`** — Phase 3 (auth hardening, expense validation, API robustness). CodeRabbit: critical merge risk, findings to address.

See [PLAN.md](PLAN.md#open-prs-review) for details and recommended merge order.
