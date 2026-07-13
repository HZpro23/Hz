import "server-only";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import type { Prisma } from "@/generated/prisma/client";

export const PRODUCTS_PAGE_SIZE = 10;

export async function getProductsPage({
  query,
  page,
  categoryId,
  status,
}: {
  query?: string;
  page: number;
  categoryId?: string;
  status?: "ACTIVE" | "INACTIVE";
}) {
  const where: Prisma.ProductWhereInput = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await withDbRetry(() =>
    Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
          images: { orderBy: { position: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PRODUCTS_PAGE_SIZE,
        take: PRODUCTS_PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ]),
  );

  return { items, total, pageSize: PRODUCTS_PAGE_SIZE };
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } } },
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      category: true,
      brand: true,
    },
  });
}

export const PUBLIC_PRODUCTS_PAGE_SIZE = 12;

export async function getPublicProductsPage({
  query,
  categorySlug,
  page,
}: {
  query?: string;
  categorySlug?: string;
  page: number;
}) {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
  };

  const [items, total] = await withDbRetry(() =>
    Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true } },
          images: { orderBy: { position: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PUBLIC_PRODUCTS_PAGE_SIZE,
        take: PUBLIC_PRODUCTS_PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ]),
  );

  return { items, total, pageSize: PUBLIC_PRODUCTS_PAGE_SIZE };
}

export async function getProductSelectOptions() {
  return prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, quantity: true },
  });
}

export async function getLowStockProducts() {
  return prisma.$queryRaw<
    {
      id: string;
      name: string;
      sku: string;
      quantity: number;
      minStockLevel: number;
    }[]
  >`SELECT id, name, sku, quantity, "minStockLevel" FROM "Product"
    WHERE quantity <= "minStockLevel" ORDER BY quantity ASC`;
}
