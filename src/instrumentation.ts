export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { default: path } = await import("path");
    const url = process.env.DATABASE_URL!;
    const isLocal = /localhost|127\.0\.0\.1/.test(url);

    const cwd = process.cwd();
    const migrationsFolder = isLocal
      ? path.join(cwd, "drizzle")
      : path.join(cwd, ".next", "server", "drizzle");

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
