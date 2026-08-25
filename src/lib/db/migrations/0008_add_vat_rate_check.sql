-- Add CHECK constraint for valid VAT rates
ALTER TABLE expenses
  ADD CONSTRAINT expenses_vat_rate_check CHECK (vat_rate > 0 AND vat_rate <= 100);
