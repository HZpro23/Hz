import "server-only";
import { prisma } from "@/lib/prisma";

export const CUSTOMERS_PAGE_SIZE = 10;

export async function getCustomersPage({
  query,
  page,
}: {
  query?: string;
  page: number;
}) {
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * CUSTOMERS_PAGE_SIZE,
      take: CUSTOMERS_PAGE_SIZE,
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total, pageSize: CUSTOMERS_PAGE_SIZE };
}

export async function getCustomerOptions() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}
