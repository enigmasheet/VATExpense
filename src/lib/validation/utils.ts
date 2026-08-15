import { z } from "zod";

type ZodLike = z.ZodError | z.ZodIssue[];

export function zodErrors(input: ZodLike): string[] {
  const issues = Array.isArray(input) ? input : input.issues;
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : null;
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: zodErrors(result.error) };
}