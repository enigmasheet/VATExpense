import { z } from "zod";
import { toFixedStr, round2 } from "@/lib/money";
import { parseMiti } from "@/lib/nepali-date";
import { companyIdSchema } from "./masters";
import { MAX_ITEM_LENGTH, MAX_REMARKS_LENGTH, MAX_NAME_LENGTH, MIN_AMOUNT_TOLERANCE, AMOUNT_TOLERANCE_RATIO } from "@/lib/constants";

export function optionalNumeric(scale: number) {
  return z.preprocess((v) => toFixedStr(v, scale), z.string().nullable().optional());
}

export function requiredNumeric(scale: number) {
  return z.preprocess(
    (v) => {
      const s = toFixedStr(v, scale);
      return s === null ? v : s;
    },
    z.string().regex(/^\d+(\.\d+)?$/, "Must be a valid number"),
  );
}

export const expenseInputSchema = z.object({
  companyId: companyIdSchema,
  fiscalYearId: z.uuid("fiscalYearId must be a valid UUID"),
  partyId: z.uuid("partyId must be a valid UUID"),
  categoryId: z.uuid("categoryId must be a valid UUID"),
  locationId: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : v),
    z.uuid("locationId must be a valid UUID").nullable().optional(),
  ),
  miti: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const parsed = parseMiti(value);
      if (!parsed.ok) {
        ctx.addIssue({ code: "custom", message: parsed.error });
      }
    }),
  invoiceNumber: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : v),
    z.string().trim().min(1, "Invoice number cannot be blank").max(MAX_NAME_LENGTH).nullable().optional(),
  ),
  item: z.string().trim().min(1, "Item is required").max(MAX_ITEM_LENGTH),
  quantity: optionalNumeric(3),
  rate: optionalNumeric(4),
  taxableAmount: requiredNumeric(2),
  vatAmount: requiredNumeric(2),
  totalAmount: requiredNumeric(2),
  vatRate: optionalNumeric(2),
  remarks: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : v),
    z.string().trim().max(MAX_REMARKS_LENGTH).nullable().optional(),
  ),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const expenseUpdateSchema = expenseInputSchema.partial();

export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;

/**
 * Tolerance for amount cross-checks: max(NPR 1.00, 0.5% of taxable).
 * The invoice's stated values always win; mismatches are warnings, not blocks.
 */
export function validateAmounts(d: {
  quantity?: string | null;
  rate?: string | null;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatRate: string;
}): string[] {
  const warnings: string[] = [];
  const taxable = Number(d.taxableAmount);
  const vat = Number(d.vatAmount);
  const total = Number(d.totalAmount);
  const vatRate = Number(d.vatRate);
  const tolerance = Math.max(MIN_AMOUNT_TOLERANCE, taxable * AMOUNT_TOLERANCE_RATIO);

  if (d.quantity !== null && d.quantity !== undefined && d.rate !== null && d.rate !== undefined) {
    const computed = round2(Number(d.quantity) * Number(d.rate));
    if (Math.abs(computed - taxable) > tolerance) {
      warnings.push(
        `Quantity × Rate = ${computed.toFixed(2)} differs from Taxable (${taxable.toFixed(2)}) by more than tolerance.`,
      );
    }
  }

  const computedVat = round2((taxable * vatRate) / 100);
  if (Math.abs(computedVat - vat) > tolerance) {
    warnings.push(
      `Taxable × VAT rate = ${computedVat.toFixed(2)} differs from VAT (${vat.toFixed(2)}) by more than tolerance.`,
    );
  }

  const computedTotal = round2(taxable + vat);
  if (Math.abs(computedTotal - total) > tolerance) {
    warnings.push(
      `Taxable + VAT = ${computedTotal.toFixed(2)} differs from Total (${total.toFixed(2)}) by more than tolerance.`,
    );
  }

  return warnings;
}