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

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  vatNumber: text("vat_number"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  defaultVatRate: numeric("default_vat_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("13.00"),
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
    isActive: boolean("is_active").notNull().default(true),
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
      .on(t.companyId, t.fiscalYearId, t.partyId, t.invoiceNumber)
      .where(sql`${t.invoiceNumber} IS NOT NULL`),
    index("expenses_miti_idx").on(t.miti),
    index("expenses_fiscal_year_idx").on(t.companyId, t.fiscalYearId),
    index("expenses_party_idx").on(t.companyId, t.partyId),
  ],
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;