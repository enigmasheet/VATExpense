-- Item-to-category linking: maps item names to expense categories per company.
CREATE TABLE "item_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"normalized_item_name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "item_categories"
	ADD CONSTRAINT "item_categories_company_id_companies_id_fk"
	FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade;

ALTER TABLE "item_categories"
	ADD CONSTRAINT "item_categories_category_id_categories_id_fk"
	FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "item_categories_company_item_uq" ON "item_categories"
	USING btree ("company_id", "normalized_item_name");

CREATE INDEX "item_categories_company_idx" ON "item_categories"
	USING btree ("company_id");

-- Truck documents: multiple documents (blue book, insurance, etc.) per truck.
CREATE TABLE "truck_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"truck_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text,
	"expiry_date" text,
	"reminder_date" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "truck_documents"
	ADD CONSTRAINT "truck_documents_company_id_companies_id_fk"
	FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade;

ALTER TABLE "truck_documents"
	ADD CONSTRAINT "truck_documents_truck_id_trucks_id_fk"
	FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE cascade;

CREATE INDEX "truck_documents_truck_idx" ON "truck_documents"
	USING btree ("truck_id");

CREATE INDEX "truck_documents_company_idx" ON "truck_documents"
	USING btree ("company_id");
