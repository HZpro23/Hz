import "server-only";
import { prisma } from "@/lib/prisma";
import { getOutstandingInvoicesSummary } from "@/features/invoices/queries";

export async function getDashboardStats() {
  const [
    totalProducts,
    totalCustomers,
    pendingOrders,
    activeOrders,
    lowStockRows,
    outstanding,
  ] = await Promise.all([
    prisma.product.count({ where: {} }),
    prisma.customer.count({ where: {} }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint AS count FROM "Product" WHERE quantity <= "minStockLevel"`,
    getOutstandingInvoicesSummary(),
  ]);

  return {
    totalProducts,
    totalCustomers,
    pendingOrders,
    activeOrders,
    lowStockCount: Number(lowStockRows[0]?.count ?? 0),
    unpaidInvoicesCount: outstanding.count,
    totalOutstandingDebt: outstanding.totalOutstanding,
  };
}
