import { db } from "@/lib/db";
import { users, adminAuditLog } from "@/lib/db/schema";
import { resetPasswordSchema } from "@/lib/validation/admin";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, unauthorized, notFound, badRequest, unprocessableEntity, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN, BCRYPT_SALT_ROUNDS } from "@/lib/constants";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

function requireSuperAdmin() {
  return getSessionUser().then((u) => {
    if (!u || u.role !== ROLE_SUPER_ADMIN) return null;
    return u;
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(resetPasswordSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return notFound("User not found");

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_SALT_ROUNDS);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));

    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "reset_password",
      targetType: "user",
      targetId: existing.id,
      targetName: existing.email,
    });

    return apiOk({ data: { reset: true } });
  } catch (err) {
    console.error("POST /api/admin/users/[id]/reset-password failed", err);
    return internalError();
  }
}
