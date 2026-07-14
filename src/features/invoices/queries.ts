import "server-only";
import { prisma } from "@/lib/prisma";

export const INVOICES_PAGE_SIZE = 10;

export async function getInvoicesPage({
  query,
  page,
}: {
  query?: string;
  page: number;
}) {
  const where = query
    ? {
        OR: [
          { invoiceNumber: { contains: query, mode: "insensitive" as const } },
          { customerName: { contains: query, mode: "insensitive" as const } },
          { customerPhone: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * INVOICES_PAGE_SIZE,
      take: INVOICES_PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total, pageSize: INVOICES_PAGE_SIZE };
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { name: true, sku: true } } },
      },
      quoteRequest: { select: { id: true } },
    },
  });
}

export async function getInvoiceByQuoteRequestId(quoteRequestId: string) {
  return prisma.invoice.findUnique({ where: { quoteRequestId } });
}
