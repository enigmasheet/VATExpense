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
});

export const createCategorySchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH),
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
});

export const createFiscalYearSchema = z.object({
  companyId: companyIdSchema,
  name: z.string().trim().min(1, "Name is required").max(MAX_FY_NAME_LENGTH),
  startYear: z.coerce.number().int().min(SUPPORTED_MIN_BS_YEAR, "Start year out of supported range").max(SUPPORTED_MAX_BS_YEAR),
  endYear: z.coerce.number().int().min(SUPPORTED_MIN_BS_YEAR, "End year out of supported range").max(SUPPORTED_MAX_BS_YEAR),
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
});

export const updateTruckSchema = z.object({
  name: z.string().trim().min(1, "Truck number is required").max(MAX_NAME_LENGTH).optional(),
  ownerName: optionalTextToNull.optional(),
  truckType: optionalTextToNull.optional(),
  isActive: z.boolean().optional(),
});

export type CreateTruckInput = z.infer<typeof createTruckSchema>;
export type UpdateTruckInput = z.infer<typeof updateTruckSchema>;

export const createItemCategorySchema = z.object({
  companyId: companyIdSchema,
  itemName: z.string().trim().min(1, "Item name is required").max(MAX_NAME_LENGTH),
  categoryId: z.uuid("categoryId must be a valid UUID"),
});

export const updateItemCategorySchema = z.object({
  itemName: z.string().trim().min(1, "Item name is required").max(MAX_NAME_LENGTH).optional(),
  categoryId: z.uuid("categoryId must be a valid UUID").optional(),
});

export type CreateItemCategoryInput = z.infer<typeof createItemCategorySchema>;
export type UpdateItemCategoryInput = z.infer<typeof updateItemCategorySchema>;

const bsDateText = z.preprocess(
  (v) => (v === null || v === undefined || v === "" ? null : v),
  z.string().trim().max(10, "Date must be in YYYY-MM-DD format").nullable().optional(),
);

export const createTruckDocumentSchema = z.object({
  companyId: companyIdSchema,
  truckId: z.uuid("truckId must be a valid UUID"),
  documentType: z.string().trim().min(1, "Document type is required").max(MAX_NAME_LENGTH),
  documentNumber: optionalTextToNull,
  expiryDate: bsDateText,
  reminderDate: bsDateText,
});

export const updateTruckDocumentSchema = z.object({
  documentType: z.string().trim().min(1, "Document type is required").max(MAX_NAME_LENGTH).optional(),
  documentNumber: optionalTextToNull.optional(),
  expiryDate: bsDateText.optional(),
  reminderDate: bsDateText.optional(),
  isActive: z.boolean().optional(),
});

export type CreateTruckDocumentInput = z.infer<typeof createTruckDocumentSchema>;
export type UpdateTruckDocumentInput = z.infer<typeof updateTruckDocumentSchema>;

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

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH).optional(),
  isActive: z.boolean().optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH).optional(),
  isActive: z.boolean().optional(),
});

export const updateFiscalYearSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(MAX_FY_NAME_LENGTH).optional(),
  startYear: z.coerce.number().int().min(SUPPORTED_MIN_BS_YEAR).max(SUPPORTED_MAX_BS_YEAR).optional(),
  endYear: z.coerce.number().int().min(SUPPORTED_MIN_BS_YEAR).max(SUPPORTED_MAX_BS_YEAR).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => d.startYear === undefined || d.endYear === undefined || d.endYear > d.startYear, {
  message: "endYear must be greater than startYear",
  path: ["endYear"],
});

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH).optional(),
  vatNumber: optionalTextToNull.optional(),
  address: optionalTextToNull.optional(),
  phone: optionalTextToNull.optional(),
  email: optionalTextToNull.optional(),
  defaultVatRate: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? undefined : toFixedStr(v, 2)),
    z.string().regex(/^\d+(\.\d+)?$/, "Invalid default VAT rate").optional(),
  ),
  brandName: optionalTextToNull.optional(),
  logoUrl: optionalTextToNull.optional(),
  primaryColor: z.string().trim().max(7).nullable().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type UpdateFiscalYearInput = z.infer<typeof updateFiscalYearSchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;