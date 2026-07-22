import Link from "next/link";
import { Boxes, Package, ShoppingCart, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ar } from "@/i18n/ar";

const REPORTS = [
  {
    href: "/dashboard/reports/products",
    icon: Package,
    title: "تقرير المنتجات",
    description: "جميع المنتجات وأسعارها وأقسامها، قابل للتصدير وإعادة الاستيراد",
  },
  {
    href: "/dashboard/reports/inventory",
    icon: Boxes,
    title: "تقرير المخزون",
    description: "جميع المنتجات وكمياتها وحالتها",
  },
  {
    href: "/dashboard/reports/orders",
    icon: ShoppingCart,
    title: "تقرير الطلبات",
    description: "جميع الطلبات وحالتها وإجمالياتها",
  },
  {
    href: "/dashboard/reports/customers",
    icon: Users,
    title: "تقرير العملاء",
    description: "العملاء وعدد طلباتهم وإجمالي مشترياتهم",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title={ar.admin.reports} />
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
          >
            <report.icon className="size-6 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">{report.title}</p>
              <p className="text-sm text-muted-foreground">
                {report.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
