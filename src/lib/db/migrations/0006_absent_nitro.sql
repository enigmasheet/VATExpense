CREATE TABLE "trucks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"owner_name" text,
	"truck_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "truck_id" uuid;--> statement-breakpoint
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trucks_company_name_uq" ON "trucks" USING btree ("company_id","normalized_name");--> statement-breakpoint
CREATE INDEX "trucks_company_idx" ON "trucks" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE set null ON UPDATE no action;