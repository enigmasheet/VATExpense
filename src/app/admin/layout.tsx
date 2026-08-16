import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-data";
import { ROLE_SUPER_ADMIN, PATH_LOGIN } from "@/lib/constants";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

/**
 * Server layout for the admin area. Only superadmins may access.
 * Redirects non-superadmins to the login page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== ROLE_SUPER_ADMIN) {
    redirect(PATH_LOGIN);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AdminSidebar />
      <main className="flex-1 px-4 py-6 md:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}