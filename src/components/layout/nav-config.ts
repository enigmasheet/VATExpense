import { ROLE_SUPER_ADMIN, PATH_EXPENSES, PATH_ADMIN } from "@/lib/constants";
import type { IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  children?: NavItem[];
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
      {
        href: PATH_EXPENSES,
        label: "Expenses",
        icon: "expenses",
        children: [
          { href: PATH_EXPENSES, label: "All Expenses", icon: "expenses" },
          { href: "/expenses/create", label: "Quick Add", icon: "quickAdd" },
          { href: "/expenses/new", label: "Batch Entry", icon: "quickAdd" },
        ],
      },
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
  if (role === ROLE_SUPER_ADMIN) {
    return [...ADMIN_NAV_GROUPS, ...NAV_GROUPS];
  }
  return NAV_GROUPS;
}
