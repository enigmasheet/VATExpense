CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"vat_number" text,
	"address" text,
	"phone" text,
	"email" text,
	"default_vat_rate" numeric(5, 2) DEFAULT '13.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"location_id" uuid,
	"miti" text NOT NULL,
	"nepali_month" text NOT NULL,
	"invoice_number" text,
	"item" text NOT NULL,
	"quantity" numeric(18, 3),
	"rate" numeric(18, 4),
	"taxable_amount" numeric(18, 2) NOT NULL,
	"vat_amount" numeric(18, 2) NOT NULL,
	"total_amount" numeric(18, 2) NOT NULL,
	"vat_rate" numeric(5, 2) NOT NULL,
	"remarks" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"vat_number" text,
	"normalized_vat_number" text,
	"location_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_company_name_uq" ON "categories" USING btree ("company_id","normalized_name");--> statement-breakpoint
CREATE INDEX "categories_company_idx" ON "categories" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_company_fy_party_invoice_uq" ON "expenses" USING btree ("company_id","fiscal_year_id","party_id","invoice_number") WHERE "expenses"."invoice_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "expenses_miti_idx" ON "expenses" USING btree ("miti");--> statement-breakpoint
CREATE INDEX "expenses_fiscal_year_idx" ON "expenses" USING btree ("company_id","fiscal_year_id");--> statement-breakpoint
CREATE INDEX "expenses_party_idx" ON "expenses" USING btree ("company_id","party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_years_company_name_uq" ON "fiscal_years" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "fiscal_years_company_idx" ON "fiscal_years" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_company_name_uq" ON "locations" USING btree ("company_id","normalized_name");--> statement-breakpoint
CREATE INDEX "locations_company_idx" ON "locations" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parties_company_vat_uq" ON "parties" USING btree ("company_id","normalized_vat_number") WHERE "parties"."normalized_vat_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "parties_company_name_idx" ON "parties" USING btree ("company_id","normalized_name");