import "server-only";
import { prisma } from "@/lib/prisma";

export const BRANDS_PAGE_SIZE = 10;

export async function getBrandsPage({
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
    prisma.brand.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * BRANDS_PAGE_SIZE,
      take: BRANDS_PAGE_SIZE,
    }),
    prisma.brand.count({ where }),
  ]);

  return { items, total, pageSize: BRANDS_PAGE_SIZE };
}

export async function getBrandOptions() {
  return prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getBrandById(id: string) {
  return prisma.brand.findUnique({ where: { id } });
}
