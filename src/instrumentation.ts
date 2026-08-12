export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const url = process.env.DATABASE_URL!;
    const isLocal = /localhost|127\.0\.0\.1/.test(url);

    if (isLocal) {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      const { db } = await import("@/lib/db");
      await migrate(db as any, { migrationsFolder: "./drizzle" });
    } else {
      const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
      const { db } = await import("@/lib/db");
      await migrate(db as any, { migrationsFolder: "./drizzle" });
    }
  }
}
