import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-data";

/**
 * Server layout for the admin area. Only superadmins may access.
 * Redirects non-superadmins to the login page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "SuperAdmin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
