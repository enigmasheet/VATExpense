"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/**
 * Provides a responsive sign-in page for credential-based authentication.
 *
 * @returns The login page interface.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div>
          <h1 className="font-display text-3xl font-semibold">VAT Expense Ledger</h1>
          <p className="mt-2 text-lg opacity-90">Nepali fiscal-year purchase register</p>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Track purchases with confidence</h2>
            <ul className="space-y-3 text-sm opacity-90">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">✓</span>
                <span>Record purchase invoices with Nepali (Bikram Sambat) dates</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">✓</span>
                <span>Automatic 13% VAT calculation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">✓</span>
                <span>Monthly and fiscal-year expense reports</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">✓</span>
                <span>Excel import for bulk data entry</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-white/20 pt-6">
            <p className="text-xs opacity-70">
              Built for Nepali businesses · Compliant with Nepal VAT regulations
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile-only branding */}
          <div className="mb-8 text-center lg:hidden">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              VAT Expense Ledger
            </h1>
            <p className="mt-1 text-sm text-muted">Nepali fiscal-year purchase register</p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground">Sign in</h2>
              <p className="mt-1 text-sm text-muted">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Field>

              {error && (
                <div className="rounded-lg border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="mt-2 w-full">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            Contact your administrator if you need an account
          </p>
        </div>
      </div>
    </div>
  );
}
