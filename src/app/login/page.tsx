"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

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
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-primary"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-primary"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
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
