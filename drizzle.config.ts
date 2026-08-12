/// <reference types="node" />
import { defineConfig } from "drizzle-kit";

const rawUrl = process.env.DATABASE_URL!;
// Strip channel_binding param — the postgres driver used by drizzle-kit doesn't support it
const url = rawUrl.replace(/[&?]channel_binding=require/g, "");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dbCredentials: { url },
});