import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ROLE_SUPER_ADMIN, PATH_LOGIN } from "@/lib/constants";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// --- Login rate limiter (in-memory sliding window) ---
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const loginAttempts = new Map<string, number[]>();

function recordFailedAttempt(key: string): boolean {
  const now = Date.now();
  const attempts = (loginAttempts.get(key) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  attempts.push(now);
  loginAttempts.set(key, attempts);
  return attempts.length > MAX_LOGIN_ATTEMPTS;
}

function isRateLimited(key: string): boolean {
  const attempts = loginAttempts.get(key) ?? [];
  return attempts.filter((t) => Date.now() - t < LOGIN_WINDOW_MS).length > MAX_LOGIN_ATTEMPTS;
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

// Reject known default superadmin password
const DEFAULT_SA_PASSWORD = "changeme";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Rate-limit by email
        if (isRateLimited(email)) {
          return null;
        }

        // Superadmin: env-based credentials, no DB row
        const saEmail = process.env.SUPERADMIN_EMAIL;
        const saPassword = process.env.SUPERADMIN_PASSWORD;
        if (saEmail && saPassword && email === saEmail) {
          if (saPassword === DEFAULT_SA_PASSWORD) {
            console.error(
              "SECURITY: Superadmin login rejected — SUPERADMIN_PASSWORD must not be 'changeme'",
            );
            return null;
          }
          if (password === saPassword) {
            clearAttempts(email);
            return {
              id: "superadmin",
              email: saEmail,
              name: "Super Admin",
              companyId: null,
              role: ROLE_SUPER_ADMIN,
            };
          }
        }

        const user = (
          await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1)
        )[0];

        if (!user || !user.isActive) {
          recordFailedAttempt(email);
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!isValid) {
          recordFailedAttempt(email);
          return null;
        }

        clearAttempts(email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          companyId: user.companyId,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.companyId = (user as unknown as { companyId?: string }).companyId;
        token.role = (user as unknown as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        const userId = token.sub as string;

        // Skip check for superadmin (no DB row)
        if (userId !== "superadmin") {
          const user = (
            await db
              .select({ isActive: users.isActive, role: users.role, companyId: users.companyId })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1)
          )[0];

          if (!user || !user.isActive) {
            return { user: null } as unknown as typeof session;
          }

          // Re-check role/companyId live (no stale JWT claims)
          token.role = user.role;
          token.companyId = user.companyId;
        }

        session.user.id = userId;
        session.user.companyId = token.companyId as string | undefined;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: PATH_LOGIN,
  },
});
