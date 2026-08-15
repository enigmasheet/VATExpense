import { ROLE_SUPER_ADMIN, PATH_EXPENSES, PATH_ADMIN } from "@/lib/constants";
import type { IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/expenses/new", label: "Add Expense", icon: "quickAdd" },
      { href: "/expenses/create", label: "New Expense", icon: "expenses" },
      { href: PATH_EXPENSES, label: "Expenses", icon: "expenses" },
      { href: "/import", label: "Import", icon: "import" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports/monthly", label: "Monthly Report", icon: "monthlyReport" },
      { href: "/reports/fiscal-year", label: "FY Report", icon: "fyReport" },
      { href: "/reports/parties", label: "Party Purchases", icon: "parties" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { href: "/parties", label: "Parties", icon: "parties" },
      { href: "/categories", label: "Categories", icon: "categories" },
      { href: "/locations", label: "Locations", icon: "locations" },
      { href: "/trucks", label: "Trucks", icon: "truck" },
      { href: "/fiscal-years", label: "Fiscal Years", icon: "fiscalYears" },
    ],
  },
];

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: "Management",
    items: [
      { href: PATH_ADMIN, label: "Admin Dashboard", icon: "management" },
    ],
  },
];

export function getNavGroups(role?: string): NavGroup[] {
  return role === ROLE_SUPER_ADMIN ? ADMIN_NAV_GROUPS : NAV_GROUPS;
}
