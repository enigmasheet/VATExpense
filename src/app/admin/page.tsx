import { AdminDashboard } from "@/components/admin-dashboard";

/**
 * Admin dashboard page. Lists all companies and provides provisioning controls.
 * Layout enforces superadmin access.
 */
export default async function AdminPage() {
  const resetEnabled = process.env.ALLOW_DB_RESET === "true";

  return <AdminDashboard resetEnabled={resetEnabled} />;
}
