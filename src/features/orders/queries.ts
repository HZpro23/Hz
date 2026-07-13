import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, OrderStatus } from "@/generated/prisma/client";

export const ORDERS_PAGE_SIZE = 10;

export async function getOrdersPage({
  query,
  status,
  page,
}: {
  query?: string;
  status?: OrderStatus;
  page: number;
}) {
  const where: Prisma.OrderWhereInput = {
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, pageSize: ORDERS_PAGE_SIZE };
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
  });
}
