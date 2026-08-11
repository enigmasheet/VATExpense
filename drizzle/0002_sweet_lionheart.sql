ALTER TABLE "import_batch_rows" ADD COLUMN "raw_location_name" text;--> statement-breakpoint
CREATE INDEX "expenses_fiscal_month_cat_idx" ON "expenses" USING btree ("company_id","fiscal_year_id","nepali_month","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");