-- Lowercase all existing invoice numbers for case-insensitive matching
UPDATE expenses SET invoice_number = lower(invoice_number) WHERE invoice_number IS NOT NULL;

-- Drop the old case-sensitive unique index
DROP INDEX IF EXISTS expenses_company_fy_party_invoice_uq;

-- Create a new case-insensitive unique index using lower()
CREATE UNIQUE INDEX expenses_company_fy_party_invoice_uq
  ON expenses (company_id, fiscal_year_id, party_id, lower(invoice_number))
  WHERE invoice_number IS NOT NULL AND is_deleted = false;
