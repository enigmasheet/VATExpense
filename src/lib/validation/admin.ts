import { z } from "zod";
import { createCompanySchema } from "./masters";

export const provisionCompanySchema = z.object({
  company: createCompanySchema,
  user: z.object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.string().trim().toLowerCase().email("Invalid email address").max(200),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    role: z.enum(["Admin", "DataEntry"]).default("Admin"),
  }),
});

export type ProvisionCompanyInput = z.infer<typeof provisionCompanySchema>;
