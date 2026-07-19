import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const REPORTS_PAGE_SIZE = 10;

export async function getInventoryReportData() {
  return prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getInventoryReportPage({ page }: { page: number }) {
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * REPORTS_PAGE_SIZE,
      take: REPORTS_PAGE_SIZE,
    }),
    prisma.product.count(),
  ]);

  return { items, total, pageSize: REPORTS_PAGE_SIZE };
}

export async function getOrdersReportData() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrdersReportPage({ page }: { page: number }) {
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * REPORTS_PAGE_SIZE,
      take: REPORTS_PAGE_SIZE,
    }),
    prisma.order.count(),
  ]);

  return { items, total, pageSize: REPORTS_PAGE_SIZE };
}

export async function getCustomersReportData() {
  const customers = await prisma.customer.findMany({
    include: { orders: { select: { total: true } } },
    orderBy: { createdAt: "desc" },
  });

  return customers.map(mapCustomerReportRow);
}

export async function getCustomersReportPage({ page }: { page: number }) {
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      include: { orders: { select: { total: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * REPORTS_PAGE_SIZE,
      take: REPORTS_PAGE_SIZE,
    }),
    prisma.customer.count(),
  ]);

  return {
    items: customers.map(mapCustomerReportRow),
    total,
    pageSize: REPORTS_PAGE_SIZE,
  };
}

function mapCustomerReportRow(customer: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  orders: { total: Prisma.Decimal | number }[];
}) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    ordersCount: customer.orders.length,
    totalSpent: customer.orders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    ),
  };
}
