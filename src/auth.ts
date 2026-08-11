import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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

        // Superadmin: env-based credentials, no DB row
        const saEmail = process.env.SUPERADMIN_EMAIL;
        const saPassword = process.env.SUPERADMIN_PASSWORD;
        if (saEmail && saPassword && email === saEmail && password === saPassword) {
          return {
            id: "superadmin",
            email: saEmail,
            name: "Super Admin",
            companyId: null,
            role: "SuperAdmin",
          };
        }

        const user = (
          await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1)
        )[0];

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!isValid) return null;

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
        session.user.id = token.sub as string;
        session.user.companyId = token.companyId as string | undefined;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
