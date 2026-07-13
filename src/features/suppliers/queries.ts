import "server-only";
import { prisma } from "@/lib/prisma";

export const SUPPLIERS_PAGE_SIZE = 10;

export async function getSuppliersPage({
  query,
  page,
}: {
  query?: string;
  page: number;
}) {
  const where = query
    ? { name: { contains: query, mode: "insensitive" as const } }
    : {};

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * SUPPLIERS_PAGE_SIZE,
      take: SUPPLIERS_PAGE_SIZE,
    }),
    prisma.supplier.count({ where }),
  ]);

  return { items, total, pageSize: SUPPLIERS_PAGE_SIZE };
}

export async function getSupplierOptions() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}
