-- Add createdBy/updatedBy (uuid, nullable) to master tables for audit tracking.
-- Columns are nullable so existing rows don't need backfill immediately.

ALTER TABLE companies ADD COLUMN created_by uuid;
ALTER TABLE companies ADD COLUMN updated_by uuid;

ALTER TABLE fiscal_years ADD COLUMN created_by uuid;
ALTER TABLE fiscal_years ADD COLUMN updated_by uuid;

ALTER TABLE locations ADD COLUMN created_by uuid;
ALTER TABLE locations ADD COLUMN updated_by uuid;

ALTER TABLE categories ADD COLUMN created_by uuid;
ALTER TABLE categories ADD COLUMN updated_by uuid;

ALTER TABLE parties ADD COLUMN created_by uuid;
ALTER TABLE parties ADD COLUMN updated_by uuid;

ALTER TABLE trucks ADD COLUMN created_by uuid;
ALTER TABLE trucks ADD COLUMN updated_by uuid;

ALTER TABLE import_batches ADD COLUMN created_by uuid;
ALTER TABLE import_batches ADD COLUMN updated_by uuid;
