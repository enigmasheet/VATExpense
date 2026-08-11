import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { Pool } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Create a .env.local file and set it.");
}

const url = process.env.DATABASE_URL;
const isLocal = /localhost|127\.0\.0\.1/.test(url);

export const db = isLocal
  ? drizzlePostgres(postgres(url), { schema })
  : drizzleNeon(new Pool({ connectionString: url }), { schema });

export type Db = typeof db;