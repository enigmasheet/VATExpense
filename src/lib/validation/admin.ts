import { z } from "zod";
import { createCompanySchema } from "./masters";
import { ROLE_ADMIN, ROLE_DATA_ENTRY, MAX_NAME_LENGTH, MAX_REMARKS_LENGTH } from "@/lib/constants";

export const provisionCompanySchema = z.object({
  company: createCompanySchema,
  user: z.object({
    name: z.string().trim().min(1, "Name is required").max(MAX_NAME_LENGTH),
    email: z.string().trim().toLowerCase().email("Invalid email address").max(MAX_NAME_LENGTH),
    password: z.string().min(8, "Password must be at least 8 characters").max(MAX_REMARKS_LENGTH),
    role: z.enum([ROLE_ADMIN, ROLE_DATA_ENTRY]).default(ROLE_ADMIN),
  }),
});

export type ProvisionCompanyInput = z.infer<typeof provisionCompanySchema>;
