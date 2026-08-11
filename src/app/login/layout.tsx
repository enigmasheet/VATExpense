import type { Metadata } from "next";
import { Geist, Geist_Mono, Spectral } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "VAT Expense Ledger - Login",
  description: "Sign in to VAT Expense Ledger",
};

/**
 * Renders the login page layout with configured fonts and full-height styling.
 *
 * @param children - The content rendered inside the layout
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spectral.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
