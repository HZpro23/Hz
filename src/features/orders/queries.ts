import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, OrderStatus } from "@/generated/prisma/client";

export const ORDERS_PAGE_SIZE = 10;

export async function getOrdersPage({
  query,
  status,
  from,
  to,
  page,
}: {
  query?: string;
  status?: OrderStatus;
  from?: string;
  to?: string;
  page: number;
}) {
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (from) createdAtFilter.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) createdAtFilter.lte = new Date(`${to}T23:59:59.999Z`);

  const where: Prisma.OrderWhereInput = {
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { customerName: { contains: query, mode: "insensitive" } },
            { customerPhone: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(from || to ? { createdAt: createdAtFilter } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
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
      items: {
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              barcode: true,
              description: true,
              quantity: true,
              price1: true,
              price2: true,
              price3: true,
              category: { select: { name: true } },
              brand: { select: { name: true } },
              images: { orderBy: { position: "asc" }, take: 1 },
            },
          },
        },
      },
      invoice: { select: { id: true } },
      customer: true,
    },
  });
}
