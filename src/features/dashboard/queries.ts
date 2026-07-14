import "server-only";
import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [totalProducts, totalCustomers, pendingQuoteRequests, activeOrders, lowStockRows] =
    await Promise.all([
      prisma.product.count({ where: {} }),
      prisma.customer.count({ where: {} }),
      prisma.quoteRequest.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
      prisma.$queryRaw<
        { count: bigint }[]
      >`SELECT COUNT(*)::bigint AS count FROM "Product" WHERE quantity <= "minStockLevel"`,
    ]);

  return {
    totalProducts,
    totalCustomers,
    pendingQuoteRequests,
    activeOrders,
    lowStockCount: Number(lowStockRows[0]?.count ?? 0),
  };
}
