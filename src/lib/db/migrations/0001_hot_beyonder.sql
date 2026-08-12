CREATE TABLE "import_batch_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_index" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_miti" text,
	"raw_invoice_number" text,
	"raw_party_name" text,
	"raw_category_name" text,
	"raw_item" text,
	"raw_quantity" text,
	"raw_rate" text,
	"raw_taxable_amount" text,
	"raw_vat_amount" text,
	"raw_total_amount" text,
	"raw_vat_rate" text,
	"raw_remarks" text,
	"resolved_party_id" uuid,
	"resolved_category_id" uuid,
	"resolved_location_id" uuid,
	"resolved_miti" text,
	"resolved_nepali_month" text,
	"resolved_taxable_amount" numeric(18, 2),
	"resolved_vat_amount" numeric(18, 2),
	"resolved_total_amount" numeric(18, 2),
	"resolved_vat_rate" numeric(5, 2),
	"errors" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'DataEntry' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batch_rows_batch_idx" ON "import_batch_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "import_batch_rows_status_idx" ON "import_batch_rows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_batches_company_idx" ON "import_batches" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "import_batches_status_idx" ON "import_batches" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_company_email_uq" ON "users" USING btree ("company_id","email");--> statement-breakpoint
CREATE INDEX "users_company_idx" ON "users" USING btree ("company_id");