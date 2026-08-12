/**
 * Auto-migration hook for Next.js.
 *
 * Runs pending Drizzle migrations on server cold start. This is the
 * platform-agnostic approach — works on Vercel, AWS, Railway, self-hosted, etc.
 *
 * Why migrations are in src/lib/db/migrations/:
 *   Next.js only bundles files within the src/ directory into serverless functions.
 *   The original drizzle/ folder at project root was excluded from the bundle,
 *   causing "Can't find meta/_journal.json" errors on Vercel. Moving migrations
 *   into src/ ensures they're included automatically.
 *
 * How it works:
 *   1. On server cold start, Next.js calls register()
 *   2. It detects the runtime (nodejs vs edge) and the database type (local vs Neon)
 *   3. Drizzle's migrate() reads the journal, compares against the DB, applies pending SQL
 *   4. Idempotent — safe to call repeatedly, only runs unapplied migrations
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { default: path } = await import("path");
    const url = process.env.DATABASE_URL!;
    const isLocal = /localhost|127\.0\.0\.1/.test(url);

    const cwd = process.cwd();
    const migrationsFolder = path.join(cwd, "src", "lib", "db", "migrations");

    if (isLocal) {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      const { db } = await import("@/lib/db");
      await migrate(db as never, { migrationsFolder });
    } else {
      const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
      const { db } = await import("@/lib/db");
      await migrate(db as never, { migrationsFolder });
    }
  }
}
