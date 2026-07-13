import "server-only";
import { prisma } from "@/lib/prisma";

export async function getInventoryReportData() {
  return prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getOrdersReportData() {
  return prisma.order.findMany({
    include: { customer: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomersReportData() {
  const customers = await prisma.customer.findMany({
    include: { orders: { select: { total: true } } },
    orderBy: { createdAt: "desc" },
  });

  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    ordersCount: customer.orders.length,
    totalSpent: customer.orders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    ),
  }));
}

export async function getQuoteRequestsReportData() {
  return prisma.quoteRequest.findMany({
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
