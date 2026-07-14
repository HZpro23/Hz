import "server-only";
import { prisma } from "@/lib/prisma";

export const MOVEMENTS_PAGE_SIZE = 15;

export async function getInventoryMovementsPage({ page }: { page: number }) {
  const [items, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * MOVEMENTS_PAGE_SIZE,
      take: MOVEMENTS_PAGE_SIZE,
    }),
    prisma.inventoryMovement.count({ where: {} }),
  ]);

  return { items, total, pageSize: MOVEMENTS_PAGE_SIZE };
}
