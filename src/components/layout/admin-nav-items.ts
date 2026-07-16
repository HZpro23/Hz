import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Users,
  ShoppingCart,
  Boxes,
  Truck,
  ClipboardList,
  Receipt,
  BarChart3,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { ar } from "@/i18n/ar";

export type AdminNavBadgeKey = "pendingOrders" | "lowStock" | "unpaidInvoices";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: AdminNavBadgeKey;
};

export type AdminNavGroup = {
  label?: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: ar.admin.dashboard, icon: LayoutDashboard },
    ],
  },
  {
    label: "الكتالوج",
    items: [
      { href: "/dashboard/products", label: ar.admin.products, icon: Package },
      {
        href: "/dashboard/categories",
        label: ar.admin.categories,
        icon: FolderTree,
      },
      { href: "/dashboard/brands", label: ar.admin.brands, icon: Tags },
    ],
  },
  {
    label: "المبيعات",
    items: [
      { href: "/dashboard/customers", label: ar.admin.customers, icon: Users },
      {
        href: "/dashboard/orders",
        label: ar.admin.orders,
        icon: ShoppingCart,
        badgeKey: "pendingOrders",
      },
      {
        href: "/dashboard/invoices",
        label: "الفواتير",
        icon: FileText,
        badgeKey: "unpaidInvoices",
      },
    ],
  },
  {
    label: "المخزون والمشتريات",
    items: [
      {
        href: "/dashboard/inventory",
        label: ar.admin.inventory,
        icon: Boxes,
        badgeKey: "lowStock",
      },
      { href: "/dashboard/suppliers", label: ar.admin.suppliers, icon: Truck },
      {
        href: "/dashboard/purchases",
        label: ar.admin.purchases,
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "التقارير والمالية",
    items: [
      { href: "/dashboard/expenses", label: ar.admin.expenses, icon: Receipt },
      { href: "/dashboard/reports", label: ar.admin.reports, icon: BarChart3 },
    ],
  },
];
