import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { VAT_RATE_DEFAULT, ROLE_DATA_ENTRY } from "@/lib/constants";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  vatNumber: text("vat_number"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  defaultVatRate: numeric("default_vat_rate", { precision: 5, scale: 2 })
    .notNull()
    .default(VAT_RATE_DEFAULT),
  brandName: text("brand_name"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  import_enabled: boolean("import_enabled").notNull().default(true),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export const fiscalYears = pgTable(
  "fiscal_years",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startYear: integer("start_year").notNull(),
    endYear: integer("end_year").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fiscal_years_company_name_uq").on(t.companyId, t.name),
    index("fiscal_years_company_idx").on(t.companyId),
  ],
);

export type FiscalYear = typeof fiscalYears.$inferSelect;
export type NewFiscalYear = typeof fiscalYears.$inferInsert;

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("locations_company_name_uq").on(t.companyId, t.normalizedName),
    index("locations_company_idx").on(t.companyId),
  ],
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_company_name_uq").on(t.companyId, t.normalizedName),
    index("categories_company_idx").on(t.companyId),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export const itemCategories = pgTable(
  "item_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    normalizedItemName: text("normalized_item_name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("item_categories_company_item_uq").on(t.companyId, t.normalizedItemName),
    index("item_categories_company_idx").on(t.companyId),
  ],
);

export type ItemCategory = typeof itemCategories.$inferSelect;
export type NewItemCategory = typeof itemCategories.$inferInsert;

export const parties = pgTable(
  "parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    vatNumber: text("vat_number"),
    normalizedVatNumber: text("normalized_vat_number"),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    comment: text("comment"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("parties_company_vat_uq")
      .on(t.companyId, t.normalizedVatNumber)
      .where(sql`${t.normalizedVatNumber} IS NOT NULL`),
    index("parties_company_name_idx").on(t.companyId, t.normalizedName),
  ],
);

export type Party = typeof parties.$inferSelect;
export type NewParty = typeof parties.$inferInsert;

export const trucks = pgTable(
  "trucks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    ownerName: text("owner_name"),
    truckType: text("truck_type"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("trucks_company_name_uq").on(t.companyId, t.normalizedName),
    index("trucks_company_idx").on(t.companyId),
  ],
);

export type Truck = typeof trucks.$inferSelect;
export type NewTruck = typeof trucks.$inferInsert;

export const truckDocuments = pgTable(
  "truck_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => trucks.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    documentNumber: text("document_number"),
    expiryDate: text("expiry_date"), // BS date, e.g. "2083-03-15"
    reminderDate: text("reminder_date"), // BS date — when to be reminded
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("truck_documents_truck_idx").on(t.truckId),
    index("truck_documents_company_idx").on(t.companyId),
  ],
);

export type TruckDocument = typeof truckDocuments.$inferSelect;
export type NewTruckDocument = typeof truckDocuments.$inferInsert;

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    fiscalYearId: uuid("fiscal_year_id")
      .notNull()
      .references(() => fiscalYears.id),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    truckId: uuid("truck_id").references(() => trucks.id, { onDelete: "set null" }),
    miti: text("miti").notNull(), // "YYYY-MM-DD" Bikram Sambat
    nepaliMonth: text("nepali_month").notNull(), // e.g. "Chaitra"
    invoiceNumber: text("invoice_number"),
    item: text("item").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 3 }),
    rate: numeric("rate", { precision: 18, scale: 4 }),
    taxableAmount: numeric("taxable_amount", { precision: 18, scale: 2 }).notNull(),
    vatAmount: numeric("vat_amount", { precision: 18, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull(),
    remarks: text("remarks"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    rowVersion: integer("row_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("expenses_company_fy_party_invoice_uq")
      .on(t.companyId, t.fiscalYearId, t.partyId, sql`lower(${t.invoiceNumber})`)
      .where(sql`${t.invoiceNumber} IS NOT NULL AND ${t.isDeleted} = false`),
    index("expenses_miti_idx").on(t.miti),
    index("expenses_fiscal_year_idx").on(t.companyId, t.fiscalYearId),
    index("expenses_party_idx").on(t.companyId, t.partyId),
    index("expenses_fiscal_month_cat_idx").on(t.companyId, t.fiscalYearId, t.nepaliMonth, t.categoryId),
    index("expenses_active_fy_idx").on(t.companyId, t.fiscalYearId).where(sql`${t.isDeleted} = false`),
  ],
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    fiscalYearId: uuid("fiscal_year_id")
      .notNull()
      .references(() => fiscalYears.id),
    filename: text("filename").notNull(),
    status: text("status").notNull().default("pending"), // pending | confirmed | cancelled
    rowCount: integer("row_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("import_batches_company_idx").on(t.companyId),
    index("import_batches_status_idx").on(t.status),
  ],
);

export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;

export const importBatchRows = pgTable(
  "import_batch_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    status: text("status").notNull().default("pending"), // pending | valid | error | duplicate
    rawMiti: text("raw_miti"),
    rawInvoiceNumber: text("raw_invoice_number"),
    rawPartyName: text("raw_party_name"),
    rawCategoryName: text("raw_category_name"),
    rawItem: text("raw_item"),
    rawQuantity: text("raw_quantity"),
    rawRate: text("raw_rate"),
    rawTaxableAmount: text("raw_taxable_amount"),
    rawVatAmount: text("raw_vat_amount"),
    rawTotalAmount: text("raw_total_amount"),
    rawVatRate: text("raw_vat_rate"),
    rawRemarks: text("raw_remarks"),
    rawLocationName: text("raw_location_name"),
    rawVatNumber: text("raw_vat_number"),
    resolvedPartyId: uuid("resolved_party_id"),
    resolvedCategoryId: uuid("resolved_category_id"),
    resolvedLocationId: uuid("resolved_location_id"),
    resolvedMiti: text("resolved_miti"),
    resolvedNepaliMonth: text("resolved_nepali_month"),
    resolvedTaxableAmount: numeric("resolved_taxable_amount", { precision: 18, scale: 2 }),
    resolvedVatAmount: numeric("resolved_vat_amount", { precision: 18, scale: 2 }),
    resolvedTotalAmount: numeric("resolved_total_amount", { precision: 18, scale: 2 }),
    resolvedVatRate: numeric("resolved_vat_rate", { precision: 5, scale: 2 }),
    errors: text("errors"), // JSON array of error messages
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("import_batch_rows_batch_idx").on(t.batchId),
    index("import_batch_rows_status_idx").on(t.status),
  ],
);

export type ImportBatchRow = typeof importBatchRows.$inferSelect;
export type NewImportBatchRow = typeof importBatchRows.$inferInsert;

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default(ROLE_DATA_ENTRY), // Admin | DataEntry
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_company_email_uq").on(t.companyId, t.email),
    index("users_company_idx").on(t.companyId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    targetName: text("target_name"),
    details: text("details"), // JSON string
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_audit_log_actor_idx").on(t.actorEmail)],
);

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;