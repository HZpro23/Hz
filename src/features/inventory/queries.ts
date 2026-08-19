import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const MOVEMENTS_PAGE_SIZE = 15;

export async function getInventoryMovementsPage({
  page,
  query,
}: {
  page: number;
  query?: string;
}) {
  const where: Prisma.InventoryMovementWhereInput = query
    ? {
        OR: [
          { reason: { contains: query, mode: "insensitive" } },
          { reference: { contains: query, mode: "insensitive" } },
          { product: { name: { contains: query, mode: "insensitive" } } },
          { product: { sku: { contains: query, mode: "insensitive" } } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * MOVEMENTS_PAGE_SIZE,
      take: MOVEMENTS_PAGE_SIZE,
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  return { items, total, pageSize: MOVEMENTS_PAGE_SIZE };
}
