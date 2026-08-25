-- Step 1: Drop the old case-sensitive unique index first
DROP INDEX IF EXISTS expenses_company_fy_party_invoice_uq;

-- Step 2: Resolve collisions by keeping the row with the lowest id per canonical key
-- A canonical key is (company_id, fiscal_year_id, party_id, lower(trim(invoice_number)))
DELETE FROM expenses
WHERE id NOT IN (
  SELECT DISTINCT ON (company_id, fiscal_year_id, party_id, lower(trim(invoice_number)))
    id
  FROM expenses
  WHERE invoice_number IS NOT NULL
  ORDER BY company_id, fiscal_year_id, party_id, lower(trim(invoice_number)), id
);

-- Step 3: Backfill all invoice numbers to lowercase-trimmed form
UPDATE expenses
SET invoice_number = lower(trim(invoice_number))
WHERE invoice_number IS NOT NULL;

-- Step 4: Create a new case-insensitive unique index using lower()
CREATE UNIQUE INDEX expenses_company_fy_party_invoice_uq
  ON expenses (company_id, fiscal_year_id, party_id, lower(invoice_number))
  WHERE invoice_number IS NOT NULL AND is_deleted = false;
