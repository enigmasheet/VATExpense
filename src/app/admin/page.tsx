import { AdminOverview } from "@/components/admin/admin-overview";

/**
 * Admin overview page. Shows system-wide statistics and recent activity.
 * Layout enforces superadmin access.
 */
export default function AdminPage() {
  return <AdminOverview />;
}