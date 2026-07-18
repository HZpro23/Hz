import { Package, Users, ShoppingCart, AlertTriangle, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { ar } from "@/i18n/ar";
import { getDashboardStats } from "@/features/dashboard/queries";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.admin.dashboard}
        description="نظرة عامة سريعة على أداء متجرك اليوم"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={ar.dashboardCards.totalProducts}
          value={stats.totalProducts}
          icon={Package}
        />
        <StatCard
          title={ar.dashboardCards.totalCustomers}
          value={stats.totalCustomers}
          icon={Users}
        />
        <StatCard
          title={ar.dashboardCards.orders}
          value={stats.activeOrders}
          icon={ShoppingCart}
        />
        <StatCard
          title={ar.dashboardCards.lowStockProducts}
          value={stats.lowStockCount}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title={ar.dashboardCards.totalOwedByCustomers}
          value={stats.totalOwedByCustomers}
          icon={Wallet}
          variant="warning"
          formatValue={(value) => formatCurrency(value)}
        />
      </div>
    </div>
  );
}
