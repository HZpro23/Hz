import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, QuoteStatus } from "@/generated/prisma/client";

export const QUOTE_REQUESTS_PAGE_SIZE = 10;

export async function getQuoteRequestsPage({
  query,
  status,
  from,
  to,
  page,
}: {
  query?: string;
  status?: QuoteStatus;
  from?: string;
  to?: string;
  page: number;
}) {
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (from) createdAtFilter.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) createdAtFilter.lte = new Date(`${to}T23:59:59.999Z`);

  const where: Prisma.QuoteRequestWhereInput = {
    ...(query
      ? {
          OR: [
            { customerName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(from || to ? { createdAt: createdAtFilter } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.quoteRequest.findMany({
      where,
      select: {
        id: true,
        customerName: true,
        phone: true,
        quantity: true,
        status: true,
        createdAt: true,
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * QUOTE_REQUESTS_PAGE_SIZE,
      take: QUOTE_REQUESTS_PAGE_SIZE,
    }),
    prisma.quoteRequest.count({ where }),
  ]);

  return { items, total, pageSize: QUOTE_REQUESTS_PAGE_SIZE };
}

export async function getQuoteRequestById(id: string) {
  return prisma.quoteRequest.findUnique({
    where: { id },
    include: {
      product: {
        include: { images: { take: 1, orderBy: { position: "asc" } } },
      },
      order: true,
    },
  });
}

export async function getPendingQuoteRequestsCount() {
  return prisma.quoteRequest.count({ where: { status: "PENDING" } });
}
