import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL!;
const isLocal = /localhost|127\.0\.0\.1/.test(url);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dbCredentials: { url },
  ...(isLocal ? {} : {}),
});