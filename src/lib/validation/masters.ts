import { z } from "zod";
import { toFixedStr } from "@/lib/money";

export const companyIdSchema = z.uuid("companyId must be a valid UUID");

export const optionalTextToNull = z.preprocess(
  (v) => (v === null || v === undefined || v === "" ? null : v),
  z.string().trim().min(1, "Cannot be blank").max(200).nullable().optional(),
);

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  vatNumber: optionalTextToNull,
  address: optionalTextToNull,
  phone: optionalTextToNull,
  email: optionalTextToNull,
  defaultVatRate: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? "13.00" : toFixedStr(v, 2)),
    z.string().regex(/^\d+(\.\d+)?$/, "Invalid default VAT rate"),
  ),
});

export const createLocationSchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(200),
  isActive: z.boolean().optional().default(true),
});

export const createCategorySchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(200),
  isActive: z.boolean().optional().default(true),
});

export const createPartySchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(200),
  vatNumber: optionalTextToNull,
  locationId: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : v),
    z.uuid("locationId must be a valid UUID").nullable().optional(),
  ),
  isActive: z.boolean().optional().default(true),
});

export const createFiscalYearSchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(50),
  startYear: z.coerce.number().int().min(2000, "Start year out of supported range").max(2099),
  endYear: z.coerce.number().int().min(2000, "End year out of supported range").max(2099),
  isActive: z.boolean().optional().default(false),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type CreateFiscalYearInput = z.infer<typeof createFiscalYearSchema>;