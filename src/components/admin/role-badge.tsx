import { Badge } from "@/components/ui/badge";
import { ROLE_ADMIN, ROLE_DATA_ENTRY, ROLE_SUPER_ADMIN } from "@/lib/constants";

const ROLE_TONE: Record<string, "default" | "warning" | "danger" | "success"> = {
  [ROLE_SUPER_ADMIN]: "danger",
  [ROLE_ADMIN]: "warning",
  [ROLE_DATA_ENTRY]: "default",
};

const ROLE_LABEL: Record<string, string> = {
  [ROLE_SUPER_ADMIN]: "Super Admin",
  [ROLE_ADMIN]: "Admin",
  [ROLE_DATA_ENTRY]: "Data Entry",
};

/**
 * Renders a color-coded badge for a user role.
 */
export function RoleBadge({ role }: { role: string }) {
  return <Badge tone={ROLE_TONE[role] ?? "default"}>{ROLE_LABEL[role] ?? role}</Badge>;
}