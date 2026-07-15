import "server-only";
import { prisma } from "@/lib/prisma";

export const CATEGORIES_PAGE_SIZE = 10;

export async function getCategoriesPage({
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
    prisma.category.findMany({
      where,
      include: {
        parent: { select: { name: true } },
        _count: { select: { products: true, children: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * CATEGORIES_PAGE_SIZE,
      take: CATEGORIES_PAGE_SIZE,
    }),
    prisma.category.count({ where }),
  ]);

  return { items, total, pageSize: CATEGORIES_PAGE_SIZE };
}

export async function getCategoryOptions(excludeId?: string) {
  return prisma.category.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export async function getPublicCategoriesWithCounts() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      imageSecureUrl: true,
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}
