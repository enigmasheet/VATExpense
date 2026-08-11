import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      email text NOT NULL,
      name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'DataEntry',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);
  console.log("users table created");

  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_company_email_uq ON users (company_id, email)
  `);
  console.log("users index created");

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS users_company_idx ON users (company_id)
  `);
  console.log("users company index created");

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
