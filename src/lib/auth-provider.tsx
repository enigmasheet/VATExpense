"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Provides authentication session context to descendant components.
 *
 * @param children - The components rendered within the authentication context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
