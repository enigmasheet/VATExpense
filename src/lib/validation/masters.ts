import { z } from "zod";
import { toFixedStr } from "@/lib/money";
import { VAT_RATE_DEFAULT, MAX_NAME_LENGTH, MAX_FY_NAME_LENGTH } from "@/lib/constants";
import { SUPPORTED_MIN_BS_YEAR, SUPPORTED_MAX_BS_YEAR } from "@/lib/nepali-date";

export const companyIdSchema = z.uuid("companyId must be a valid UUID");

export const optionalTextToNull = z.preprocess(
  (v) => (v === null || v === undefined || v === "" ? null : v),
  z.string().trim().min(1, "Cannot be blank").max(MAX_NAME_LENGTH).nullable().optional(),
);

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH),
  vatNumber: optionalTextToNull,
  address: optionalTextToNull,
  phone: optionalTextToNull,
  email: optionalTextToNull,
  defaultVatRate: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? VAT_RATE_DEFAULT : toFixedStr(v, 2)),
    z.string().regex(/^\d+(\.\d+)?$/, "Invalid default VAT rate"),
  ),
});

export const createLocationSchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH),
  isActive: z.boolean().optional().default(true),
});

export const createCategorySchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH),
  isActive: z.boolean().optional().default(true),
});

export const createPartySchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH),
  vatNumber: optionalTextToNull,
  locationId: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : v),
    z.uuid("locationId must be a valid UUID").nullable().optional(),
  ),
  phone: optionalTextToNull,
  whatsapp: optionalTextToNull,
  comment: optionalTextToNull,
  isActive: z.boolean().optional().default(true),
});

export const createFiscalYearSchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(MAX_FY_NAME_LENGTH),
  startYear: z.coerce.number().int().min(SUPPORTED_MIN_BS_YEAR, "Start year out of supported range").max(SUPPORTED_MAX_BS_YEAR),
  endYear: z.coerce.number().int().min(SUPPORTED_MIN_BS_YEAR, "End year out of supported range").max(SUPPORTED_MAX_BS_YEAR),
  isActive: z.boolean().optional().default(false),
}).refine((d) => d.endYear > d.startYear, {
  message: "endYear must be greater than startYear",
  path: ["endYear"],
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type CreateFiscalYearInput = z.infer<typeof createFiscalYearSchema>;

export const createTruckSchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Truck number is required").max(MAX_NAME_LENGTH),
  ownerName: optionalTextToNull,
  truckType: optionalTextToNull,
  isActive: z.boolean().optional().default(true),
});

export const updateTruckSchema = z.object({
  name: z.string().trim().min(1, "Truck number is required").max(MAX_NAME_LENGTH).optional(),
  ownerName: optionalTextToNull.optional(),
  truckType: optionalTextToNull.optional(),
  isActive: z.boolean().optional(),
});

export type CreateTruckInput = z.infer<typeof createTruckSchema>;
export type UpdateTruckInput = z.infer<typeof updateTruckSchema>;

export const updatePartySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH).optional(),
  vatNumber: optionalTextToNull.optional(),
  locationId: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : v),
    z.uuid("locationId must be a valid UUID").nullable().optional(),
  ),
  phone: optionalTextToNull.optional(),
  whatsapp: optionalTextToNull.optional(),
  comment: optionalTextToNull.optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePartyInput = z.infer<typeof updatePartySchema>;