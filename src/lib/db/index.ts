import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Create a .env.local file and set it.");
}

const connection = neon(process.env.DATABASE_URL);

export const db = drizzle(connection, { schema });

export type Db = typeof db;